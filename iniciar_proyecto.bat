@echo off
echo ========================================================
echo INICIANDO PROYECTO MAO 2026
echo ========================================================
echo.
echo Verificando Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] No se encontro Node.js. Por favor, instala Node.js (https://nodejs.org/) para continuar.
    pause
    exit /b
)

echo.
echo Instalando/Actualizando dependencias... (Esto puede tomar unos segundos)
call npm install

echo.
echo Iniciando el servidor de desarrollo...
echo Presiona CTRL + C cuando desees detener el servidor.
echo.
call npm run dev
