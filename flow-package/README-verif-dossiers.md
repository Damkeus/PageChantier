# VerifierDossiersSchema — flux Power Automate

Déclenché par Power Apps au clic sur **"Enregistrer"** dans l'éditeur de schéma du PCF
**PageFicheChantier** (`nex.PageFicheChantier` ≥ 1.5.0). Le flux reçoit l'enveloppe de schéma
directement dans son trigger et crée l'arborescence manquante sous `6. Tablette` :

```
<FolderPath du projet>/6. Tablette/<Liaison>/<Élément>/
```

Il ne touche jamais aux dossiers déjà présents. `6. Tablette` est supposé exister (il fait
partie de l'arborescence projet par défaut) — le flux ne le crée pas.

## Import du flux

1. Power Automate → **Mes flux → Importer → Importer un package (hérité)**.
2. Sélectionner `VerifierDossiersSchema.zip`.
3. Sur la ressource *SharePoint*, cliquer **Sélectionner pendant l'importation** et mapper une
   connexion SharePoint existante. Si le flux existe déjà d'une version précédente, choisir
   **Mettre à jour** sur la ressource Flow (les GUID sont inchangés).
4. Importer, puis ouvrir le flux dans le designer.

## Étapes de vérification manuelle après import (important)

Ce package est écrit à la main sans accès direct à la liste SharePoint. Trois points à
reconfirmer dans le designer avant de publier :

1. **Colonne `FolderPath`** — dans `Initialize_varFolderPath`, la clé utilisée est le nom
   d'affichage. Si SharePoint utilise un nom interne différent (espaces → `_x0020_`, etc.),
   rouvrir le contenu dynamique sur `Get_items` et resélectionner `FolderPath`.
   *(`SchemaData` n'est plus lu du tout : le schéma arrive par le trigger.)*
2. **Champ de nom retourné par `Lister_elements_existants` (`ListFolder`)** — l'action
   `ExistingElementNames` suppose un champ `Name` sur chaque entrée. Vérifier le nom exact
   (`Name` ou `DisplayName`) via le contenu dynamique et corriger si besoin.
3. **Adresse du site (`dataset`)** — `https://nexans.sharepoint.com/sites/t-nex` est en dur dans
   les 4 actions SharePoint (`Get_items`, `Creer_dossier_liaison`, `Lister_elements_existants`,
   `Creer_dossier_element`). Vérifier/resélectionner le site dans chacune.

Une fois ces points confirmés, enregistrer puis publier. Aucune action ne doit afficher ⚠.

## Entrées du déclencheur (PowerApps V2)

| Entrée | Source côté PCF |
|---|---|
| `projectUniqID` | sortie `schemaProjectUniqId` — sert uniquement à retrouver `FolderPath` dans `Table Fiche Chantier` |
| `schemaJson` | sortie `schemaChange` — l'enveloppe v2 complète (liaisons + ordreSchema + labels) |

Le schéma transite par le trigger et **non** par la colonne `SchemaData` : au moment du clic,
le Patch Power Apps n'est pas forcément terminé, relire la liste risquerait de lire l'ancien
schéma.

## Formule Power Apps

Sur le contrôle PCF PageFicheChantier, propriété **OnChange** :

```
If(
    !IsBlank(Self.schemaSaveTimestamp) && Self.schemaSaveTimestamp <> varLastSchemaSave,
    Set(varLastSchemaSave, Self.schemaSaveTimestamp);
    VerifierDossiersSchema.Run(Self.schemaProjectUniqId, Self.schemaChange);
    Notify("Dossiers du schéma vérifiés", NotificationType.Success)
)
```

Dans **App.OnStart** : `Set(varLastSchemaSave, "")`.

`schemaSaveTimestamp` change à chaque enregistrement, donc `OnChange` se déclenche même quand le
schéma est rigoureusement identique — sans lui, deux enregistrements successifs produiraient une
sortie inchangée et le flux ne partirait pas.

## Logique du flux

1. `Liaisons` = `liaisons` de l'enveloppe reçue ; `Ordres` + `AllOrdres` concatènent tous les
   `ordreSchema`.
2. `Get_items` sur `Table Fiche Chantier` filtré `ProjectUniqID eq '<projectUniqID>'` → `FolderPath`
   (ex. `/Copie RTE ENEDIS/Projet 2026/LS RTE Berthollet Robinson/Arborescence RTE type 2.0`).
3. **Garde-fou** `Verifier_schema_non_vide` : si `AllOrdres` est vide (**0 élément au total**) ou
   si `FolderPath` est vide → le flux s'arrête sans rien créer.
4. `FolderPath` est décomposé : premier segment = bibliothèque (`Copie RTE ENEDIS`), reste =
   chemin du projet ; `TablettePath` = `<chemin projet>/6. Tablette`.
5. Pour chaque liaison (boucle séquentielle sur `range(0, length(liaisons))` — l'index vient de
   `range`, pas d'un compteur, qui serait non déterministe dans une boucle) :
   - Nom = `comment` s'il est renseigné, sinon `Liaison N` (N = position, 1-indexée).
   - Liaison **sans élément → ignorée**, aucun dossier créé.
   - `CreateNewFolder` du dossier de liaison, puis `ListFolder` pour lister les sous-dossiers
     existants (l'échec « dossier déjà présent » est absorbé par les `runAfter` tolérants).
   - Pour chaque élément : nom = `label` s'il est renseigné, sinon `Extrémité N` / `Jonction N`
     (N = position dans la liaison ; `type === 'termination'` → Extrémité, sinon Jonction).
     Le dossier n'est créé que s'il est absent de la liste.
6. Tous les noms passent par un assainissement qui remplace les caractères interdits par
   SharePoint (`" * : < > ? / \ |`) par `_`.
7. Aucune réponse renvoyée à Power Apps (fire-and-forget).

## Vérification

```bash
cd flow-package/verif-dossiers-src
python3 -m json.tool "Microsoft.Flow/flows/9dfc086d-95ab-4a2f-abdb-b8512ac068a6/definition.json"
unzip -t ../VerifierDossiersSchema.zip
```

Test bout en bout avec l'enveloppe type :
```json
{"version":2,"liaisons":[
  {"comment":"Liaison LSA","ordreSchema":"","elements":[]},
  {"comment":"Liaison LSB","ordreSchema":"2,3","elements":[
    {"type":"termination","subtype":"nzo","label":"Transfo LSB"},
    {"type":"termination","subtype":"droite_directe","label":"Cellule LSB"}
  ]}
]}
```
Attendu : `6. Tablette/Liaison LSB/Transfo LSB/` et `6. Tablette/Liaison LSB/Cellule LSB/`.
Rien pour Liaison LSA (0 élément). Relancer une 2ᵉ fois : run vert, aucun dossier recréé.

Sans label, les mêmes éléments donneraient `Extrémité 1` et `Extrémité 2`.

## Note sur la structure

Une version antérieure de ce flux créait les dossiers **à plat** sous `6. Tablette`. Les dossiers
éventuellement produits par cette version ne sont ni déplacés ni supprimés par le flux actuel.
