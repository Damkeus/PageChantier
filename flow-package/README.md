# EnvoiPhotosChantier — flux Power Automate + intégration Power Apps

Flux importable qui reçoit le `PhotoPayloadJSON` émis par le PCF MenuChantier et enregistre
chaque photo dans SharePoint sous `Documents/Chantiers/<projet>/<liaison>/` (ou `General`
si la photo n'est pas rattachée à une liaison).

## Import du flux

1. Power Automate → **Mes flux → Importer → Importer un package (hérité)**.
2. Sélectionner `EnvoiPhotosChantier.zip`.
3. Sur la ressource *SharePoint*, cliquer **Sélectionner pendant l'importation** et mapper
   une connexion SharePoint existante.
4. Importer, puis ouvrir le flux dans le designer pour vérifier qu'aucune action n'affiche
   d'avertissement.

Entrées du déclencheur (PowerApps V2) :

| Entrée | Description |
|---|---|
| `siteUrl` | URL du site SharePoint (ex : `https://contoso.sharepoint.com/sites/chantiers`) |
| `projectName` | Nom du projet/chantier (utilisé comme nom de dossier) |
| `photosJson` | La sortie `PhotoPayloadJSON` du PCF, telle quelle |

> La bibliothèque cible est `Documents`. Si votre bibliothèque a un autre nom, modifiez les
> paramètres `table` (Créer dossier) et le préfixe de `folderPath` (Créer fichier) dans le designer.

## Formules Power Apps

Ajouter le flux à l'app (volet Power Automate), puis sur le contrôle PCF, propriété **OnChange** :

```
If(
    Self.PhotoTrigger && !IsBlank(Self.PhotoPayloadJSON) && Self.PhotoPayloadJSON <> varLastPhotoPayload,
    Set(varLastPhotoPayload, Self.PhotoPayloadJSON);
    EnvoiPhotosChantier.Run(
        varSharepointUrl,          // ou la colonne SharepointUrl liée au contrôle
        varProject.Title,          // nom du projet affiché dans le PCF
        Self.PhotoPayloadJSON
    );
    Notify("Photos envoyées", NotificationType.Success)
)
```

Le garde `varLastPhotoPayload` est nécessaire : `PhotoTrigger` passe aussi à `true` à
l'ouverture du panneau photo, avant toute capture. Initialiser la variable dans **App.OnStart** :

```
Set(varLastPhotoPayload, "")
```

## Format du payload

`PhotoPayloadJSON` est un tableau JSON :

```json
[{
  "base64": "<jpeg base64 sans préfixe data URI>",
  "fileName": "Liaison_LSB_Transfo_LSB_1752345678_123",
  "photoType": "schema",
  "zoneLabel": "Liaison LSB - Transfo LSB",
  "liaison": "Liaison LSB"
}]
```

Le flux ajoute l'extension `.jpg` au `fileName`.

## Échantillons de schéma (dossier `samples/`)

Pour tester le PCF dans le harness (`npm start`), coller dans la propriété `JSONSchema` :

- `schema-v1-deux-liaisons.json` — format v1 : 2 onglets, LSA sans schéma (message
  "Schéma non défini"), LSB avec labels personnalisés.
- `schema-v1-labels-partiels.json` — v1 avec moins de labels que de tokens → fallback E/J,
  et une liaison sans commentaire → onglet "Liaison 2".
- `schema-legacy.json` — ancien format : vue unique sans onglets, comportement inchangé.
