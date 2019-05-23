# Script that starts the shiny webserver
# Parameters are supplied using environment variables

.libPaths(c(Sys.getenv('E_LIB'), .libPaths()));

library('shiny')
shiny::shinyOptions(
	electron=TRUE, 
	ptRVersion=Sys.getenv('E_PTR_VERSION'), 
	HOME=Sys.getenv('E_HOME')
)	
	
shiny::runApp(
	system.file('App', package = 'pointR'),
	host = '127.0.0.1',
	launch.browser = FALSE,
	port = as.integer(Sys.getenv("E_PTR_PORT"))
)
	
	