

@GlobalComponent
class LadderTesterVue extends VueWithProps({
	ladder: FairLadder,
}) {
	@VueTemplate
	get _t() {
		return `
			<TESTER-VUE>

				<div style="max-width: 300px;">
					Ticking every {{ tickInterval.toFixed(1) }}s
					<a-slider v-model:value="tickInterval"
							:dots="true" :min="0" :max="1" :step="0.1"
							style="max-width: 300px;"
							>
						<template #mark> tick interval </template>	
					</a-slider>
				</div>

				<a-input-number min="0" max="10" step="0.1" v-model:value="tickSpeed">
					<template #addonBefore>
						Tick amount
					</template>
				</a-input-number>
				<br>

				<a-switch v-model:checked="ticking">
					<template #checkedChildren> ticking </template>
					<template #unCheckedChildren> paused </template>
				</a-switch>
				<br> <br>

				<a-button type="primary">
					TEST
				</a-button>

			</TESTER-VUE>
		`;
	}

	tickInterval = 1;
	tickSpeed = 1;
	ticking = false;


	passedTime = 0;
	mounted() {
		setInterval(() => this.tick(), 100);
	}

	tick() {
		if (this.ticking) {
			this.passedTime += 100;
			if (this.passedTime > this.tickInterval * 999) {
				this.passedTime = 0;
				this.emitUpdate();
			}
		} else {
			this.passedTime = 0;
		}
	}

	emitUpdate() {
		ladder.handleLadderUpdates({
			events: [],
			secondsPassed: this.tickSpeed,
		});
	}

}


