# ptR
This is an electron-based wrapper around the shiny pointR package. This wrapper provides

1. a standardize graphical interface (removin the depencency upon the users browser)
2. enhancement of pointR by providing a mechanism to debug custom build shiny input controls within pointR. 
3. A mostly seamless installation for both linux and mac

Binary packages are available.

On the initial startup the following will occur

1. Checks for Rscript (or Rscript.exe). If not found, prompt user to locate via a file-open-dialog box, and saves for
future sessions.
2. Checks to see all if R-packages needed for the pointR app  are currently available.
    - shiny, tidyverse, pointR, ...
3. If the user agrees, the needed R-packages are installed.
4. Starts the pointR shiny app.

Note: 

- I have supplie a windows installer, but I do not have access to windows so it is untested. 
- I currently cannot provide certificates and will need to purchase them in order to provide a better installition process.
- If building from scratch, be sure to the icon permissions are set to 0644 (sudo chmod 0644)
