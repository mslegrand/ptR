packageMatrix<-installed.packages();
if(!('devtools' %in% packageMatrix)){
    install.packages("devtools")
};
library(devtools);

cranPackages<-c(
    "shiny",
    "shinyjs",  
    "R.utils",
    "shinyAce",
    "stringr",  
    "jsonlite", 
    "shinyFiles",
    "shinythemes",
    "colourpicker",
    "shinyWidgets",
    "bsplus",
    "fs",
    "knitr", 
    "tidyverse",
    "shinyjqui"
);

gitPackages<-c(
    "svgR",
    "shinyDMDMenu",
    "pointR"
);

pm<-packageMatrix[,1];
tt1<-setdiff( cranPackages,pm );
i=1;
for(pkg in tt1){
    i<-i+1;
    cat(paste(i,'> installing', pkg));
    Sys.sleep(1);
    install.packages(pkg);
};
tt2<-setdiff( gitPackages,pm );
for(pkg in tt2){
    i<-i+1;
    cat(paste(i,'> installing', pkg));
    Sys.sleep(1);
    install_github(paste0('mslegrand/',pkg), upgrade="never");
}; 
cat('endInstall');