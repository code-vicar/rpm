# 1.5.1
breaking: changed install 'hard' option shorthand from -h to -H to avoid conflicting with --help (-h)
fix: added a missing catch for error in install command when git url could not be downloaded
fix: create tmp packing directory with nodejs os.tempdir and fs.mkdtempSync