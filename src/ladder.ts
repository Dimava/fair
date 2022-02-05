


class Player {
	constructor() {
		return Vue.reactive(this);
	}
}

class Ranker {

	constructor() {
		return Vue.reactive(this);
	}
}

class FairLadder {
	socket?: FairSocket;
	state = Vue.reactive({
		connected: false,
		rankers: {} as Record<number, Ranker>,
	});
}