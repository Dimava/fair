// https://raw.githack.com/Dimava/fair-client/master/dist/index.html

let userData = new UserData();
userData.uuid = localStorage.getItem('uuid') || '';

let socket = new FairSocket();
socket.userData = userData;

let chat = new FairChat();
chat.socket = socket;
chat.userData = userData;

let ladder = new FairLadder();
ladder.socket = socket;
ladder.userData = userData;


class AppVue extends VueWithProps({
	chat: FairChat,
	userData: UserData,
	socket: FairSocket,
	ladder: FairLadder,
}) {
	importModalOpened = false;
	newUuid: uuid = '';

	showFakeLadder = false;
	@VueTemplate
	get _t() {
		return `
			<APP>
				<a-space>
					<a-button v-if="${!this.socket.state.connected}"
						:loading="${this.socket.state.connectionRequested}"
						@click="${this.connectSocket()}"
						> Connect Socket </a-button>
					<a-button v-if="${!this.ladder.state.connected}"
						:disabled="${!this.socket.state.connected}"
						:loading="${this.ladder.state.connectionRequested}"
						@click="${this.connectLadder()}"
						> Connect Ladder </a-button>
					<a-button v-if="${!this.chat.state.connected && !this.showFakeLadder}"
						:disabled="${!this.socket.state.connected}"
						:loading="${this.chat.state.connectionRequested}"
						@click="${this.connectChat()}"
						> Connect Chat </a-button>
					<a-button v-if="${!this.chat.state.connected && !this.showFakeLadder}"
						:disabled="${!this.ladder.state.connected}"
						@click="${this.showFakeLadder = true}"
						> Ladder debug tools </a-button>
					<a-button v-if="${!this.chat.state.connected && !this.ladder.state.connected}"
						@click="${this.loadFakeLadder()}"
						> Load fake ladder </a-button>
				</a-space>
				<a-row>
					<a-col span="14">
						<FairLadderVue v-if="${this.ladder.state.connected}" :ladder="${this.ladder}" />
					</a-col>
					<a-col span="10">
						<FairChatVue v-if="${this.chat.state.connected}" :chat="${this.chat}" :ladder="${this.ladder}" />

						<LadderTesterVue v-if="${this.showFakeLadder}" :ladder="${this.ladder}" />
					</a-col>
				</a-row>
				<a-modal
						v-model:visible="${this.importModalOpened}"
						title="UUID import"
						@ok="${this.confirmUuidImport()}"
						>
					This client does not support making its own uuids
					<br>
					Please paste your UUID
					<a-input ref="elNewUuidInput" v-model:value="${this.newUuid}" @pressEnter="${this.confirmUuidImport()}" maxlength="36" />
				</a-modal>

			</APP>
		`;
	}
	mounted() {
		if (!this.userData.uuid) {
			this.importModalOpened = true;
		}
	}
	confirmUuidImport() {
		if (this.newUuid.match(/........-....-....-....-............/)) {
			this.userData.uuid = this.newUuid;
			localStorage.setItem('uuid', this.newUuid);
			this.importModalOpened = false;
			location.reload();
		} else {
			this.importModalOpened = true;
		}
	}
	async connectSocket() {
		await socket.connect();
	}
	async connectChat() {
		let chat = Vue.toRaw(this.chat);
		chat.state.connectionRequested = true;
		await new Promise(r => setTimeout(r, 500));
		chat.state.connectionRequested = false;
		await chat.connect();
	}
	async connectLadder() {
		let ladder = Vue.toRaw(this.ladder);
		ladder.state.connectionRequested = true;
		await new Promise(r => setTimeout(r, 500));
		ladder.state.connectionRequested = false;
		await ladder.connect();
		antd.message.info(`Check out the "Center yourself" filter in Username column!`);
	}
	loadFakeLadder() {
		let _l = JSON.parse(localStorage.getItem('_ladder')!);
		ladder.handleLadderInit(_l as any);
	}
}

let app = Vue.createApp(AppVue, {
	socket,
	chat,
	ladder,
	userData,
}).use(VuePropDecoratorAVariation.custom)
	.use(VuePropDecoratorAVariation.known)
	.use(antd);
app.mount('#app');
