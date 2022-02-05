function VueWithProps<T extends Record<string, VuePropDecoratorAVariation.ValidPropDefinition>>(propDefinitionObject: T) {
	return VueClassComponent.Vue.with(VuePropDecoratorAVariation.makeClass(propDefinitionObject));
}
const VueTemplate = VuePropDecoratorAVariation.Template;
const GlobalComponent = VuePropDecoratorAVariation.Component;

type accountId = number & { _?: 'accountId' };
type uuid = string & { _?: 'uuid' };

const numberFormatter = new numberformat.Formatter({
	format: 'hybrid',
	sigfigs: 6,
	flavor: 'short',
	minSuffix: 1e10,
	maxSmall: 0,
});

class UserData {
	uuid: uuid = '';
	accountId: accountId = 0;
	username: string = 'Me';
	constructor() {
		return Vue.reactive(this);
	}
}
