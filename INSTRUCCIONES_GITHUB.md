# Subir este proyecto a GitHub

Como la carpeta de este proyecto ya tiene el registro interno de Git activado con todos sus archivos listos, solo necesitas seguir estos pasos para subirlo a tu cuenta de GitHub y tenerlo en la nube de forma segura:

### Paso 1: Crea un Repositorio Vacío en GitHub
1. Entra a tu cuenta en [GitHub.com](https://github.com).
2. Haz clic en el botón verde de la esquina superior derecha que dice **"New"** (o Nuevo Repositorio).
3. Ponle un nombre a tu repositorio (ejemplo: `mao-2026-inventory`).
4. Déjalo en "Público" o "Privado" según prefieras.
5. **MUY IMPORTANTE**: NO marques la casilla que dice "Add a README file" ni la de ".gitignore". El repositorio debe estar completamente vacío.
6. Haz clic en el botón verde **"Create repository"**.

### Paso 2: Vincular y subir tu código actual
1. GitHub te mostrará una página con varias opciones. Busca la sección que dice: **"…or push an existing repository from the command line"**.
2. Copia las tres líneas de código que te aparecen ahí. Se verán algo así:
   ```bash
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   git branch -M main
   git push -u origin main
   ```
3. Abre una terminal (PowerShell o CMD) dentro de esta misma carpeta (`c:\Users\ludin\Downloads\mao 2026\mao 2026`).
4. Pega esas tres líneas de código, presiona Enter, y listo. Si es la primera vez, tal vez te pida iniciar sesión en GitHub en una ventanita que aparecerá.

---

# ¿Cómo abrir el proyecto en otra computadora?

Para abrir este proyecto de forma rápida en cualquier otra computadora con Windows, he creado un archivo llamado **`iniciar_proyecto.bat`** en esta misma carpeta.

**Instrucciones:**
1. Copia toda esta carpeta (`mao 2026`) en una memoria USB o descárgala desde tu GitHub en la otra computadora.
2. Asegúrate de que la otra computadora tenga instalado **Node.js** (puedes descargarlo desde `nodejs.org`).
3. Haz doble clic en el archivo **`iniciar_proyecto.bat`**.
4. ¡El sistema instalará automáticamente cualquier cosa que le falte y abrirá el servidor local!
