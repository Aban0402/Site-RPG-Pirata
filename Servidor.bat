@echo off
title Servidor RPG Forge
echo Iniciando o servidor do RPG Forge...
start node server.js
timeout /t 2 /nobreak >nul
start http://localhost:3000