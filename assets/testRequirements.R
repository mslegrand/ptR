packageMatrix<-installed.packages();
requirePackages<-c(
"shiny",
"shinyjs",  
"R.utils",
"svgR",
"shinyAce",
"stringr",  
"jsonlite", 
"shinyDMDMenu",
"shinyFiles",
"shinythemes",
"colourpicker",
"shinyWidgets",
"bsplus",
"fs",
"knitr", 
"tidyverse",
"shinyjqui",
"pointR");



pm<-packageMatrix[,1];
tt<-setdiff( requirePackages,pm );
if(length(tt)==0){ 
    tt<-NULL 
} else {
   tt <-paste0('"',tt,'"', collapse=", ")
};
    
cat(paste0("[",tt,"]"))

