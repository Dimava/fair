declare namespace numberformat {
	export interface FormatOptions {
		backend: 'native' | 'decimal.js',
		flavor: 'full' | 'short',
		suffixGroup: 'full',
		suffixFn(index: number): string,
		// minimum value to use any suffix, because '99,900' is prettier than '99.9k'
		minSuffix: number,
		// don't use sigfigs for smallish numbers. #13
		minSuffixSigfigs: boolean,
		// Special formatting for numbers with a decimal point
		maxSmall: number,
		sigfigs: number, // often overridden by flavor
		format: 'standard' | 'hybrid' | 'scientific' | 'longScale',

	}
	export const defaultOptions: FormatOptions;
	export class Formatter {
		/**
		 * @param {Object} opts All formatter configuration.
		 * @param {string} [opts.flavor='full'] 'full' or 'short'. Flavors can modify any number of other options here. Full is the default; short has fewer sigfigs and shorter standard-suffixes.
		 * @param {Object} [opts.flavors] Specify your own custom flavors.
		 * @param {string} [opts.backend='native'] 'native' or 'decimal.js'.
		 * @param {string} [opts.suffixGroup]
		 * @param {Function} [opts.suffixFn]
		 * @param {number} [opts.minSuffix=1e5]
		 * @param {number} [opts.maxSmall=0] Special formatting for numbers with a decimal point
		 * @param {number} [opts.sigfigs=5]
		 * @param {number} [opts.format='standard'] 'standard', 'hybrid', 'scientific', 'longScale'.
		 * @param {Object} [opts.formats] Specify your own custom formats.
		 * @param {Function} [opts.Decimal] With the decimal.js backend, use this custom decimal.js constructor, like decimal.js-light or break_infinity.js. By default, we'll try to import decimal.js.
		 */
		constructor(opts: {
			flavor?: 'full' | 'short',
			flavors?: any,
			backend?: 'native' | 'decimal.js',
			suffixGroup?: string,
			suffixFn?: Function,
			minSuffix?: number,
			maxSmall?: number,
			sigfigs?: number,
			format?: 'standard' | 'hybrid' | 'scientific' | 'longScale',
			formats?: Object,
			Decimal?: Function,
		});

		/**
		 * @param {number} val
		 * @param {Object} [opts]
		 * @return {number} which suffix to use for this number in a list of suffixes. You can also think of this as "how many commas are in the number?"
		 */
		index(val: number, opts?: FormatOptions): number;
		/**
		 * @param {number} val
		 * @param {Object} [opts]
		 * @return {string} The suffix that this number would use, with no number shown.
		 * @example
		 * new Formatter().suffix(1e6)
		 * // => " million"
		 * @example
		 * new Formatter().suffix(1e6, {flavor: "short"})
		 * // => "M"
		 */
		suffix(val: number, opts?: FormatOptions): string;
		/**
		 * Format a number.
		 * @param {number} val
		 * @param {Object} [opts] Override the options provided to the Formatter constructor.
		 * @return {string} The formatted number.
		 * @example
		 * new Formatter().format(1e6)
		 * // => "1.0000 million"
		 */
		format(val: number, opts?: FormatOptions): string;
		/**
		 * Format a number with a specified flavor. It's very common to call the formatter with different flavors, so it has its own shortcut.
		 *
		 * `Formatter.formatFull()` and `Formatter.formatShort()` are also available.
		 * @param {number} val
		 * @param {string} flavor 'short' or 'full'. See opts.flavor.
		 * @param {Object} [opts]
		 * @return {string} The formatted number.
		 * @example
		 * new Formatter().format(1e6, 'short')
		 * // => "1.00M"
		 */
		formatFlavor(val: number, flavor?: 'short' | 'full', opts?: object): string;
		/**
		 * @param {Object} [opts]
		 * @return {string[]} The complete list of formats available. Use this to build an options UI to allow your players to choose their favorite format.
		 */
		listFormats(opts?: FormatOptions): string[];
	}
	export const numberformat: Formatter;

	/**
	 * Format a number using the default options.
	 * @param {number} val
	 * @param {Object} [opts]
	 * @return string
	 * @example
	 * format(1e6)
	 * // => "1.0000 million"
	 * @example
	 * format(1e6, {sigfigs: 1})
	 * // => "1 million"
	 */
	export const format: (val: number, opts?: FormatOptions) => string;
	/**
	 * Format a full-flavor number using the default options. Identical to `format()`
	 * @param {number} val
	 * @param {Object} [opts]
	 * @return string
	 * @example
	 * format(1e6)
	 * // => "1.0000 million"
	 */
	export const formatFull: (val: number, opts?: FormatOptions) => string;
	/**
	 * Format a short-flavor number using the default options.
	 * @param {number} val
	 * @param {Object} [opts]
	 * @return string
	 * @example
	 * format(1e6)
	 * // => "1.00M"
	 */
	export const formatShort: (val: number, opts?: FormatOptions) => string;
}