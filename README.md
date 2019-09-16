# titanium-codemods

`titanium-codemods` is a collection of codemod scripts for [jscodeshift](https://github.com/facebook/jscodeshift) that intends to make dealing with deprecations and changes in Titanium a little easier.

# Usage

We recommend using `titanium-codemods` via `npx`, this ensures that you're always pulling the newest version.

```sh
npx titanium-codemods --help # display the help
```

To run codemods `cd` into your project directory and run `npx titanium-codemods run --dry-run`.

This will prompt to select the transforms to run, once selected the transforms will be ran, and the changes will be logged to the console.

After reviewing the changes you can run `npx titanium-codemods run` to perform the changes on disk

# Included codemods

* [getter-deprecation](transforms/getter-deprecation.js)
	* Handle migration for deprecation of getters for properties in SDK 8.
* [setter-deprecation](transforms/setter-deprecation.js)
	* Handle migration for deprecation of setters for properties in SDK 8.

# Caveats

There's some caveats to running this. As we can't track _what_ an object is, for example in `myLabel.setText('test');` we can't be certain that `myLabel` is actually a `Ti.UI.Label` instance. We recommend validating that the changes are correct rather than relying on the output to be correct.
