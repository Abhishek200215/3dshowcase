ABHISHEK E T — GITHUB PAGES PORTFOLIO

Deploy:
1. Extract this ZIP.
2. Create a GitHub repository and upload the extracted files and folders.
   index.html must be at the repository root, not inside another folder.
3. Open repository Settings > Pages.
4. Under Build and deployment, select Deploy from a branch.
5. Select main and / (root), then Save.
6. Wait for GitHub to publish and open the Pages URL shown there.

Include assets/ and vendor/ unchanged. There is no build step or backend.
The .nojekyll file is included; keep it when uploading with Git.

Local preview:
Run python -m http.server 8000 in the extracted folder.
Visit http://localhost:8000 (do not simply double-click index.html).

Includes the seven-floor 3D building, readable wall displays, floor tours,
animated toolkit, updated contact section and footer. No source-download link.
3D performance depends on the device. A Canvas fallback is included for
browsers without WebGL. Motion controls and reduced-motion support are included.

Contact currently links to https://abhisheket.com/ as supplied.
Update the Start a conversation link in index.html if you prefer an email address.
Project-related photographs are illustrative, not screenshots of live products.
Third-party Three.js license is retained in vendor/.
