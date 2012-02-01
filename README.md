### Lively3D

Lively3D is three dimensional windowing environment, which was developed to study the limits of modern web technologies.
The environment is based on GLGE, by Paul Brunt, WebGL-library which abstract WebGL implementation details from developer.

The features of Lively3D include canvas-application embedding, redefinement of 3D-scene, persistance and deployment in Dropbox.

### Canvas-Applications

Lively3D provides interfaces for embedding existing canvas-rendered applications to the environment. Required functions are presented in [Application Template] (https://github.com/Zharktas/Lively3D/blob/master/templates/ApplicationTemplate.js).

### 3D-Scenes

Similar interfaces are provided for 3D-scenes, which redefine presentation of applications. Functions for implementation are presented in [Scene Template] (https://github.com/Zharktas/Lively3D/blob/master/templates/SceneTemplate.js).

### Persistance

State of the desktop and its applications can be saved in txt-file, which can be restored to the environment via dropbox.

### Deployment in Dropbox

Applications, scenes and saved states are saved in dropbox folder, which enables collaborative development when this folder is shared between developers.
Lively3D fetches files from the dropbox via php-proxy.

### Installation

HTML-directory contains the current build of Lively3D. Place this folder anywhere accesible by apache and php.
dropboxfiles- and uploadedfiles-directories need read- and write-permissions for the user running apache.

For the dropbox api initialization, you need to create application at https://www.dropbox.com/developers/apps. The application needs full access to dropbox, since Lively3D was developed using the old (and now deprecated) api.
To generate OAuth tokens, you can use [Bens Dropbox Library's] (https://github.com/BenTheDesigner/Dropbox) [setup.php] (https://github.com/BenTheDesigner/Dropbox/blob/master/tests/setup.php).
Copy the consumer tokens from the dropbox website and secret tokens generated by the setup-script to the Lively3D's php-files.

To deploy Lively3D-content to the dropbox, copy GLGE-directory to the root of dropbox-account.