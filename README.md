# Roku Package Manager

Roku package manager will download dependencies listed in an 'rpm.json'.

Dependencies must be ['git urls'](https://docs.npmjs.com/files/package.json#urls-as-dependencies).

Dependencies will be downloaded and stored in a 'roku_modules' folder.

Upon packaging of your roku app with the 'pack' command, RPM will look through all dependencies in roku_modules and copy components and source files into the correct spots in the dependent application.

# How to install

This package is available in the npm registry

https://www.npmjs.com/package/@code-vicar/rpm

```
npm install @code-vicar/rpm
```

# Commands

## install

Install will download git-url dependencies into a roku_modules directory

if the -h (--hard) flag is provided, the downloaded packages will also be copied into the source and components folders

## pack

The pack command merges the roku_modules packages with the app source and components folders in a zip archive

## deploy

Deploys the zip archive created by the pack command to a roku device ip address
