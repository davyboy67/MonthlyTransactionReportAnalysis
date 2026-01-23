@echo off
echo Starting Dashboard API...

cd /d "%~dp0"

set ASPNETCORE_ENVIRONMENT=Development

dotnet run --urls=https://localhost:7152;http://localhost:5152

pause