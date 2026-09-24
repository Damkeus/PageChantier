# EnvoiPhotosChantier — flux Power Automate + intégration Power Apps

Flux importable qui reçoit le `PhotoPayloadJSON` émis par le PCF MenuChantier (≥ 2.9.0) au clic sur
**Valider** et dépose chaque photo dans le dossier du repère, **déjà créé** par `VerifierDossiersSchema` :

```
<ProjectFolderPath>/6. Tablette/<Liaison>/<Élément>/     photo prise sur un repère
<ProjectFolderPath>/6. Tablette/<Liaison>/Général/       photo « Général » depuis le schéma
<ProjectFolderPath>/6. Tablette/Général/                 photo depuis le menu principal
```

Le flux ne crée aucun dossier explicitement. Si un dossier manque (ex. `Général`, ou label renommé
depuis la création des dossiers), l'action SharePoint *Créer un fichier* le crée à la volée.

## Import du flux

1. Power Automate → **Mes flux → Importer → Importer un package (hérité)**.
2. Sélectionner `EnvoiPhotosChantier.zip`. Si le flux existe déjà, choisir **Mettre à jour** sur la
   ressource Flow (GUID inchangés).
3. Sur la ressource *SharePoint*, **Sélectionner pendant l'importation** → connexion SharePoint existante.
4. Importer, ouvrir le flux dans le designer : aucune action ne doit afficher ⚠.
5. Dans Power Apps Studio, **retirer puis rajouter** le flux dans le volet Power Automate : la signature
   du `Run()` a changé (`siteUrl`/`projectName` → `projectFolderPath`).

Le site `https://nexans.sharepoint.com/sites/t-nex` est en dur dans `Creer_fichier` (comme dans
`VerifierDossiersSchema`).

## Entrées du déclencheur (PowerApps V2)

| Entrée | Source |
|---|---|
| `projectFolderPath` | colonne `ProjectFolderPath` du chantier, ex. `/Copie RTE ENEDIS/Projet 2026/Urrugne/Arborescence RTE type 2.0` |
| `photosJson` | sortie `PhotoPayloadJSON` du PCF, telle quelle |

Réponse : `{ result: "ok" | "error", count }`.

## Formules Power Apps

Sur le contrôle PCF MenuChantier, propriété **OnChange** (remplacer `<chantier>` par l'enregistrement
de la liste déjà utilisé pour alimenter `ProjectJSON`) :

```
If(
    !IsBlank(Self.PhotoSendTimestamp) && Self.PhotoSendTimestamp <> varLastPhotoSend,
    Set(varLastPhotoSend, Self.PhotoSendTimestamp);
    Set(varPhotoResult, EnvoiPhotosChantier.Run(<chantier>.ProjectFolderPath, Self.PhotoPayloadJSON));
    If(
        varPhotoResult.result = "ok",
        Notify("Photos envoyées (" & varPhotoResult.count & ")", NotificationType.Success),
        Notify("Échec de l'envoi des photos", NotificationType.Error)
    )
)
```

Dans **App.OnStart** : `Set(varLastPhotoSend, "")`.

`PhotoSendTimestamp` change à chaque clic sur **Valider**, et seulement là. Ne plus se baser sur
`PhotoTrigger`, qui passe aussi à `true` à l'ouverture du panneau photo.

## Nommage des dossiers

Le PCF calcule `liaisonFolder` / `elementFolder` avec **la même règle** que `VerifierDossiersSchema`
(`MenuChantier/photoFolders.ts`) :

- Liaison : `comment`, sinon `Liaison N`.
- Élément : `label`, sinon `Extrémité N` (`type = termination`) / `Jonction N`. N = position dans le
  tableau brut `elements`, avant le tri des schémas v1. Le PCF affiche `E1`/`J2`, mais le dossier
  reste `Extrémité 1`/`Jonction 2`.
- Le flux assainit ensuite chaque segment avec la même chaîne `replace` (`" * : < > ? / \ |` → `_`).

## Format du payload

`PhotoPayloadJSON` est un tableau JSON. Les photos sont réduites dans le PCF (2048 px max,
JPEG 0.85). Si une image n'est pas décodable (HEIC), l'original est envoyé avec son extension.

```json
[{
  "base64": "<jpeg base64 sans préfixe data URI>",
  "fileName": "LS1_Pyl_ne_LS1_DP_2026-09-25_14h32m05.jpg",
  "photoType": "schema",
  "zoneLabel": "LS1 - Pylône LS1",
  "liaison": "LS1",
  "liaisonFolder": "LS1",
  "elementFolder": "Pylône LS1"
}]
```

`fileName` = `<liaison>_<repère>_<initiales>_<AAAA-MM-JJ>_<HHhMMmSS>.<ext>` (`MenuChantier/photoNaming.ts`) :

- Initiales : `CurrentUserName` (lier à `User().FullName`) — segment omis si vide.
- Date/heure : prise de vue de la photo, heure locale. Caméra : instant du déclenchement ;
  galerie : EXIF `DateTimeOriginal`, sinon date du fichier.
- Deux photos du même lot à la même seconde : suffixe `_2`, `_3`… (le flux écrit le nom tel quel).

## Échantillons de schéma (dossier `samples/`)

Pour tester le PCF dans le harness (`npm start`), coller dans la propriété `JSONSchema` :

- `schema-v1-deux-liaisons.json` — format v1 : 2 onglets, LSA sans schéma (message
  "Schéma non défini"), LSB avec labels personnalisés.
- `schema-v1-labels-partiels.json` — v1 avec moins de labels que de tokens → fallback E/J,
  et une liaison sans commentaire → onglet "Liaison 2".
- `schema-legacy.json` — ancien format : vue unique sans onglets, comportement inchangé.
