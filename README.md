#Minesweeper

Setup:
Minesweeper is heavilly using the SharedArrabyBuffer's technology to be able withandle large fields. Because all current browsers requires to setup special headers to allow using SAB, theapplication required to run a sepparate dedicated web server.

Prerequsites:
Node - v14.18.1
Npm - 6.14.15

Install:
After getting the source code from repository move to teh root folder and run npm --save-dev install. This will install all required dependencies to run the app.

Run:
After succesfull installation, execute `npm start` command. This will launch the dedicated web server.
If you are using Windows 10 OS, it may require you to provide certain permissions. Open windows terminal, and execute the following command in the root folder `Set-ExecutionPolicy -ExecutionPolicy Unrestricted -Scope Process`. On success, teh server should be up and runnin on the prot 8080. Vist http://localhost:8080 in your Chrome browser and enjoy. 