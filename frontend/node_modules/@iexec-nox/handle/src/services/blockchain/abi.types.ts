import type { SolidityType, JsValue } from '../../utils/types.js';

/**
 * A read-only function fragment in a JSON ABI format
 */
export interface AbiReadFunctionJsonFragment extends AbiFunctionJsonFragment {
  readonly stateMutability: 'view' | 'pure';
}

/**
 *  A fragment for a method in a JSON ABI format
 */
interface AbiFunctionJsonFragment {
  readonly type: 'function';
  /**
   *  The name of the function
   */
  readonly name: string;
  /**
   *  If the function is payable.
   */
  readonly payable?: boolean;
  /**
   *  If the function is constant.
   */
  readonly constant?: boolean;
  /**
   *  The mutability state of the function.
   */
  readonly stateMutability?: string;
  /**
   *  The input parameters.
   */
  readonly inputs?: ReadonlyArray<JsonFragmentType>;
  /**
   *  The output parameters.
   */
  readonly outputs?: ReadonlyArray<JsonFragmentType>;
}

/**
 * Extract JS types from a function Abi fragment for inputs or outputs
 * - For outputs with a single element: unwraps the type (returns T instead of [T])
 * - For inputs: always returns an array
 */
export type AbiFragmentTypes<
  AbiFragment extends AbiFunctionJsonFragment,
  ParametersType extends 'inputs' | 'outputs',
> =
  AbiFragment[ParametersType] extends ReadonlyArray<JsonFragmentType>
    ? AbiFragment[ParametersType] extends readonly [infer First, ...infer Rest]
      ? First extends JsonFragmentType
        ? Rest extends ReadonlyArray<JsonFragmentType>
          ? Rest extends readonly []
            ? // Single output: unwrap for outputs, keep array for inputs
              ParametersType extends 'outputs'
              ? JsonFragmentTypeToJsValue<First>
              : [JsonFragmentTypeToJsValue<First>]
            : // Multiple outputs: always return array
              [
                JsonFragmentTypeToJsValue<First>,
                ...OutputArrayToJsValueArray<Rest>,
              ]
          : [JsonFragmentTypeToJsValue<First>]
        : never
      : AbiFragment[ParametersType] extends readonly []
        ? []
        : OutputArrayToJsValueArray<AbiFragment[ParametersType]>
    : unknown[];

/**
 *  A Type description in a JSON ABI format
 */
interface JsonFragmentType {
  /**
   *  The parameter name.
   */
  readonly name?: string;
  /**
   *  If the parameter is indexed.
   */
  readonly indexed?: boolean;
  /**
   *  The type of the parameter.
   */
  readonly type?: string;
  /**
   *  The internal Solidity type.
   */
  readonly internalType?: string;
  /**
   *  The components for a tuple.
   */
  readonly components?: ReadonlyArray<JsonFragmentType>;
}

/**
 * Convert array of JsonFragmentType to array of JsValue types
 */
type OutputArrayToJsValueArray<T extends ReadonlyArray<JsonFragmentType>> =
  T extends readonly [infer First, ...infer Rest]
    ? First extends JsonFragmentType
      ? Rest extends ReadonlyArray<JsonFragmentType>
        ? [JsonFragmentTypeToJsValue<First>, ...OutputArrayToJsValueArray<Rest>]
        : [JsonFragmentTypeToJsValue<First>]
      : never
    : [];

/**
 * Convert single JsonFragmentType to corresponding JsValue
 * Handles primitives (uint, address, etc.) and tuples (structs)
 */
type JsonFragmentTypeToJsValue<T extends JsonFragmentType> =
  T['type'] extends 'tuple'
    ? T['components'] extends ReadonlyArray<JsonFragmentType>
      ? ComponentsToObject<T['components']>
      : unknown
    : T['type'] extends SolidityType
      ? JsValue<T['type']>
      : unknown;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type EmptyObject = {};

/**
 * Convert array of tuple components to an object type
 * Maps each component's name to its corresponding JsValue type
 */
type ComponentsToObject<T extends ReadonlyArray<JsonFragmentType>> =
  T extends readonly []
    ? EmptyObject
    : T extends readonly [infer First, ...infer Rest]
      ? First extends JsonFragmentType
        ? Rest extends ReadonlyArray<JsonFragmentType>
          ? (First['name'] extends string
              ? { [K in First['name']]: JsonFragmentTypeToJsValue<First> }
              : EmptyObject) &
              ComponentsToObject<Rest>
          : First['name'] extends string
            ? { [K in First['name']]: JsonFragmentTypeToJsValue<First> }
            : EmptyObject
        : EmptyObject
      : EmptyObject;
