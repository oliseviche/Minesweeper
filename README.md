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
If you are using Windows 10 OS, it may require you to provide certain permissions. Open windows terminal, and execute the following command in the root folder `Set-ExecutionPolicy -ExecutionPolicy Unrestricted -Scope Process`. On success, the server should be up and running on the port 8080. Visit http://localhost:8080 in your Chrome browser and enjoy. 

Explaining video:
https://www.loom.com/share/5482daba587f4355a09a9b0cf54c64ab

Go & play:
https://delightful-desert-00d409610.3.azurestaticapps.net/?height=100&width=100&mines=999
