# Roku Package Manager

Roku package manager will download dependencies listed in an 'rpm.json'.

Dependencies must be ['git urls'](https://docs.npmjs.com/files/package.json#urls-as-dependencies).

Dependencies will be downloaded and stored in a 'roku_modules' folder.

Upon packaging of your roku app with the 'pack' command, RPM will look through all dependencies in roku_modules and copy components and source files into the correct spots in the dependent application.
