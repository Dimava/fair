function VueWithProps<T extends Record<string, VuePropDecoratorAVariation.ValidPropDefinition>>(propDefinitionObject: T) {
	return VueClassComponent.Vue.with(VuePropDecoratorAVariation.makeClass(propDefinitionObject));
}
const VueTemplate = VuePropDecoratorAVariation.Template;
const GlobalComponent = VuePropDecoratorAVariation.Component;
function VueReactive<T extends object>(target: T) {
	return Vue.reactive(target) as T;
}

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

function unescapeHtml(s: string) {
	return s.replace(/&.{1,10}?;/g, c => {
		let a = document.createElement('b');
		a.innerHTML = c;
		console.log('unescapeHtml', [s, c, a.innerText]);
		return a.innerText;
	});
}
