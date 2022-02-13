

@GlobalComponent({
	watch: {
		interpolateOffset(offset: number) {
			let ladder: FairLadder = this.ladder;
			ladder.interpolateLadder(offset);
		}
	}
})
class LadderTesterVue extends VueWithProps({
	ladder: FairLadder,
}) {
	@VueTemplate
	get _t() {
		return `
			<TESTER-VUE>

				<div style="max-width: 300px;">
					Ticking every {${this.tickInterval.toFixed(1)}}s
					<a-slider v-model:value="${this.tickInterval}"
							dots :min="${0}" :max="${1}" :step="${0.1}"
							style="max-width: 300px;"
							>
						<template #mark> tick interval </template>
					</a-slider>
				</div>

				<div style="max-width: 300px;">
					Interpolated by {${this.interpolateOffset.toFixed(1)}}s
					<a-slider v-model:value="${this.interpolateOffset}"
							dots :min="${0}" :max="${5}" :step="${0.1}"
							style="max-width: 300px;"
							>
						<template #mark> tick interval </template>
					</a-slider>
					ever
				</div>

				<a-input-number min="0" max="10" step="0.1" v-model:value="${this.tickSpeed}">
					<template #addonBefore>
						Tick amount
					</template>
				</a-input-number>
				<br>

				<a-switch v-model:checked="${this.ticking}">
					<template #checkedChildren> ticking </template>
					<template #unCheckedChildren> paused </template>
				</a-switch>
				<a-switch v-model:checked="${this.updateEveryFrame}">
					<template #checkedChildren> updating </template>
					<template #unCheckedChildren> paused </template>
				</a-switch>
				<br> <br>

				<a-button type="primary" @click="${this.ladder.fakeRequest('MULTI')}">
					Multi
				</a-button>
				can:{${this.ladder.canRequest('multi')}}
				({${this.format(this.ladder.state.yourRanker.power)}} / {${this.format(this.ladder.getMultiplierCost())}})
				<a-progress title="bias"
					:percent="${+(this.ladder.state.yourRanker.power / this.ladder.getMultiplierCost() * 100).toFixed(0)}" />

				<br> <br>
				<a-button type="primary" @click="${this.ladder.fakeRequest('BIAS')}">
					Bias
				</a-button>
				can:{${this.ladder.canRequest('bias')}}
				({${this.format(this.ladder.state.yourRanker.points)}} / {${this.format(this.ladder.getBiasCost())}})
				<a-progress title="bias"
					:percent="${+(this.ladder.state.yourRanker.points / this.ladder.getBiasCost() * 100).toFixed(0)}" color="yellow" />

				
				<br> <br>
				<a-input-number v-model:value="${this.yourRanker.multiplier}">
					<template #addonBefore>multi</template>
				</a-input-number>
				<a-input-number v-model:value="${this.yourRanker.bias}">
					<template #addonBefore>bias</template>
				</a-input-number>

			</TESTER-VUE>
		`;
	}

	tickInterval = 1;
	tickSpeed = 1;
	ticking = false;

	interpolateOffset = 0;
	updateEveryFrame = false;

	passedTime = 0;
	mounted() {
		setInterval(() => this.tick(), 100);

		void (async () => {
			while (true) {
				await new Promise(requestAnimationFrame);
				if (this.updateEveryFrame)
					this.interpolateOffset = (performance.now() - this.ladder.state.updateEndRealtime) / 1000;
			}
		})();
	}
	format(n: number) {
		return numberFormatter.format(n);
	}

	get yourRanker() {
		return this.ladder.state.yourRanker;
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


