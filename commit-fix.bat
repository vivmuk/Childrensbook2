@echo off
echo Committing TypeScript fix...
git add app/api/generate-book/route.ts
git commit -m "Fix TypeScript error: Use fetch API for Venice parameters"
git push origin main
echo Done!
pause


