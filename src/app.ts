// https://raw.githack.com/Dimava/fair-client/master/dist/index.html

let userData = new UserData();
userData.uuid = localStorage.getItem('uuid') || '';

let socket = new FairSocket();
socket.userData = userData;

let chat = new FairChat();
chat.socket = socket;

chat.userData = userData;


class AppVue extends VueWithProps({
	chat: FairChat,
	userData: UserData,
	socket: FairSocket,
}) {
	importModalOpened = false;
	newUuid: uuid = '';
	@VueTemplate
	get _t() {
		return `
			<APP>
				<FairChatVue :chat="chat" />
				<a-modal
						v-model:visible="${this.importModalOpened}"
						title="UUID import"
						@ok="confirmUuidImport"
						>
					This client does not support making its own uuids
					<br>
					Please paste your UUID
					<a-input ref="elNewUuidInput" v-model:value="newUuid" @pressEnter="confirmUuidImport" :maxlength="36" />
				</a-modal>

				<a-button v-if="${!this.socket.state.connected}" 
					:loading="${this.socket.state.connectionRequested}"
					@click="connectSocket"
					> Connect socket </a-button>
				<a-button v-if="${!this.chat.data.connected}"
					:disabled="${!this.socket.state.connected}"
					:loading="${this.chat.data.connectionRequested}"
					@click="connectChat"
					> Connect chat </a-button>
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
	connectSocket() {
		socket.connect();
	}
	connectChat() {
		chat.connect();
	}
}

let app = Vue.createApp(AppVue, {
	socket,
	chat,
	userData,
}).use(VuePropDecoratorAVariation.custom)
	.use(VuePropDecoratorAVariation.known)
	.use(antd);
app.mount('#app');
