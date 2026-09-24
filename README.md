# Sample Data pour les Inputs du PCF "MenuChantier"

Ce document contient des données d'exemple (sample data) pour vous aider à tester les différentes propriétés (inputs) du composant PCF dans l'environnement de test (harness) ou directement dans Power Apps.

Les inputs configurés dans le fichier `ControlManifest.Input.xml` attendent tous des chaînes de caractères (SingleLine.Text). Lorsqu'il s'agit d'objets JSON, vous devez utiliser des chaînes de caractères (stringified JSON).

---

## 1. `ProjectJSON` (Obligatoire)

Cette propriété contient les informations principales du projet affichées sur la vue principale (Titre, Chef de Projet, Adresse, URL des documents, etc.).

### Structure de l'objet (pour compréhension) :
```json
{
  "Title": "Chantier Haute Tension - Paris Nord",
  "AddressChantier": "123 Rue de la Sous-Station, 75018 Paris",
  "PM": "Jean Dupont",
  "ProjectUniqID": "PRJ-2023-089",
  "folderpath": "/Copie RTE ENEDIS/Projet 2026/PRJ-2023-089/Arborescence RTE type 2.0",
  "MonteurMail": "monteur.expert@nexans.com",
  "ordreSchema": "1, 2, , 4, 3"
}
```

### Valeur à coller dans Power Apps ou dans l'outil de test PCF (Stringifié) :
```text
{"Title":"Chantier Haute Tension - Paris Nord","AddressChantier":"123 Rue de la Sous-Station, 75018 Paris","PM":"Jean Dupont","ProjectUniqID":"PRJ-2023-089","folderpath":"/Copie RTE ENEDIS/Projet 2026/PRJ-2023-089/Arborescence RTE type 2.0","MonteurMail":"monteur.expert@nexans.com","ordreSchema":"1, 2, , 4, 3"}
```

### Dossier du chantier (boutons Documents et Notice)

Le chemin du dossier projet est lu dans `ProjectJSON`, dans cet ordre : `ProjectFolderPath`, `folderpath`, `FolderPath`, `ProjectPath`.
C'est le même chemin **relatif au site** que celui des flux photo, par ex. `/Copie RTE ENEDIS/Projet 2026/Urrugne/Arborescence RTE type 2.0`
(une URL complète `https://…` est aussi acceptée). Le PCF le préfixe par `https://nexans.sharepoint.com/sites/t-nex` (constante de `sharepointLinks.ts`) :

| Bouton | Dossier ouvert |
|---|---|
| Documents (accueil) | `<dossier projet>/6. Tablette` |
| Notice (vue schéma et fiche d'un repère) | `<dossier projet>/6. Tablette/Notice` |

---

## 2. `JSONSchema` (Optionnel)

Cette propriété définit l'ordre d'affichage des composants du schéma unifilaire.
*(Note : l'application supporte également la récupération de `ordreSchema` directement depuis `ProjectJSON`, mais si cette propriété est utilisée, voici le format attendu).*

**Les identifiants possibles :**
- `1` : Extrémité Simple
- `2` : Extrémité ZnO
- `3` : Droite Directe
- `4` : Jonction Simple
- `5` : Jonction avec Malt
- `6` : Jonction avec Arrêt d'Écran
- *(Un espace vide, ex: ` ` crée un espace vide dans le schéma)*

### Structure de l'objet :
```json
{
  "ordreSchema": "1, 4, 2, , 6, 3"
}
```

### Valeur à coller dans Power Apps ou dans l'outil de test PCF :
```text
{"ordreSchema":"1, 4, 2, , 6, 3"}
```

---

## 3. `ContactChantierJSON` (Optionnel)

Cette propriété permet de configurer les contacts affichés dans la modale de contacts.
*(Note : les contacts peuvent aussi être inclus directement dans `ProjectJSON` via la clé `"Contact"`).*

### Structure de l'objet (Tableau de contacts) :
```json
[
  {
    "type": "Chef de Projet",
    "Name": "Jean Dupont",
    "Tel": "06 12 34 56 78",
    "Adresse": "Nexans Siège"
  },
  {
    "type": "Client",
    "Name": "Alice Martin",
    "Tel": "07 89 12 34 56",
    "Adresse": "Site Client"
  }
]
```

### Valeur à coller dans Power Apps ou dans l'outil de test PCF :
```text
[{"type":"Chef de Projet","Name":"Jean Dupont","Tel":"06 12 34 56 78","Adresse":"Nexans Siège"},{"type":"Client","Name":"Alice Martin","Tel":"07 89 12 34 56","Adresse":"Site Client"}]
```

---

## 4. `SharepointUrl` (Optionnel)

Repli des boutons Documents et Notice quand `ProjectJSON` ne fournit aucun chemin de dossier : l'URL est alors ouverte telle quelle.

### Valeur à coller dans Power Apps ou dans l'outil de test PCF :
```text
https://company.sharepoint.com/sites/chantiers/PRJ-2023-089/Documents
```

---

## Résumé pour tester toutes les fonctionnalités d'un coup

Si vous souhaitez tester l'application dans son entièreté (Schéma fonctionnel, Modale Contacts, etc.), vous pouvez utiliser un **`ProjectJSON`** très complet, car le composant a été conçu pour savoir extraire la majorité des informations de cet input unique :

**Le `ProjectJSON` complet :**
```text
{"Title":"Chantier Ligne HT-B","AddressChantier":"45 Avenue Ampère, 69000 Lyon","PM":"Marie Curie","folderpath":"https://nexans.sharepoint.com","ordreSchema":"1, 4, 5, , 3, 2","Contact":[{"type":"Chef de Projet","Name":"Marie Curie","Tel":"06 11 22 33 44","Adresse":"Agence Lyon"},{"type":"Fournisseur","Name":"Bob Bricoleur","Tel":"06 99 88 77 66","Adresse":"Entrepôt Local"}]}
```
