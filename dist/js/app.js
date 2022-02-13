"use strict";
// https://raw.githack.com/Dimava/fair-client/master/dist/index.html
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
    newUuid = '';
    showFakeLadder = false;
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
        }
        else {
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
        let _l = JSON.parse(localStorage.getItem('_ladder'));
        ladder.handleLadderInit(_l);
    }
}
__decorate([
    VueTemplate
], AppVue.prototype, "_t", null);
let app = Vue.createApp(AppVue, {
    socket,
    chat,
    ladder,
    userData,
}).use(VuePropDecoratorAVariation.custom)
    .use(VuePropDecoratorAVariation.known)
    .use(antd);
app.mount('#app');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2FwcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsb0VBQW9FOzs7Ozs7O0FBRXBFLElBQUksUUFBUSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUM7QUFDOUIsUUFBUSxDQUFDLElBQUksR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUVuRCxJQUFJLE1BQU0sR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFDO0FBQzlCLE1BQU0sQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO0FBRTNCLElBQUksSUFBSSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUM7QUFDMUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7QUFDckIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7QUFFekIsSUFBSSxNQUFNLEdBQUcsSUFBSSxVQUFVLEVBQUUsQ0FBQztBQUM5QixNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztBQUN2QixNQUFNLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztBQUczQixNQUFNLE1BQU8sU0FBUSxZQUFZLENBQUM7SUFDakMsSUFBSSxFQUFFLFFBQVE7SUFDZCxRQUFRLEVBQUUsUUFBUTtJQUNsQixNQUFNLEVBQUUsVUFBVTtJQUNsQixNQUFNLEVBQUUsVUFBVTtDQUNsQixDQUFDO0lBQ0QsaUJBQWlCLEdBQUcsS0FBSyxDQUFDO0lBQzFCLE9BQU8sR0FBUyxFQUFFLENBQUM7SUFFbkIsY0FBYyxHQUFHLEtBQUssQ0FBQztJQUV2QixJQUFJLEVBQUU7UUFDTCxPQUFPOzs7dUJBR2MsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTO2tCQUNqQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxtQkFBbUI7Z0JBQ3ZDLElBQUksQ0FBQyxhQUFhLEVBQUU7O3VCQUViLENBQUMsSUFBSSxD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LENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sQ0FBQyxLQUFLLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDO1FBQ3hDLE1BQU0sSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsR0FBRyxLQUFLLENBQUM7UUFDekMsTUFBTSxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsNERBQTRELENBQUMsQ0FBQztJQUNqRixDQUFDO0lBQ0QsY0FBYztRQUNiLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUUsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFTLENBQUMsQ0FBQztJQUNwQyxDQUFDO0NBQ0Q7QUF2RkE7SUFEQyxXQUFXO2dDQWtEWDtBQXdDRixJQUFJLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRTtJQUMvQixNQUFNO0lBQ04sSUFBSTtJQUNKLE1BQU07SUFDTixRQUFRO0NBQ1IsQ0FBQyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxNQUFNLENBQUM7S0FDdkMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQztLQUNyQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDWixHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gaHR0cHM6Ly9yYXcuZ2l0aGFjay5jb20vRGltYXZhL2ZhaXItY2xpZW50L21hc3Rlci9kaXN0L2luZGV4Lmh0bWxcclxuXHJcbmxldCB1c2VyRGF0YSA9IG5ldyBVc2VyRGF0YSgpO1xyXG51c2VyRGF0YS51dWlkID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3V1aWQnKSB8fCAnJztcclxuXHJcbmxldCBzb2NrZXQgPSBuZXcgRmFpclNvY2tldCgpO1xyXG5zb2NrZXQudXNlckRhdGEgPSB1c2VyRGF0YTtcclxuXHJcbmxldCBjaGF0ID0gbmV3IEZhaXJDaGF0KCk7XHJcbmNoYXQuc29ja2V0ID0gc29ja2V0O1xyXG5jaGF0LnVzZXJEYXRhID0gdXNlckRhdGE7XHJcblxyXG5sZXQgbGFkZGVyID0gbmV3IEZhaXJMYWRkZXIoKTtcclxubGFkZGVyLnNvY2tldCA9IHNvY2tldDtcclxubGFkZGVyLnVzZXJEYXRhID0gdXNlckRhdGE7XHJcblxyXG5cclxuY2xhc3MgQXBwVnVlIGV4dGVuZHMgVnVlV2l0aFByb3BzKHtcclxuXHRjaGF0OiBGYWlyQ2hhdCxcclxuXHR1c2VyRGF0YTogVXNlckRhdGEsXHJcblx0c29ja2V0OiBGYWlyU29ja2V0LFxyXG5cdGxhZGRlcjogRmFpckxhZGRlcixcclxufSkge1xyXG5cdGltcG9ydE1vZGFsT3BlbmVkID0gZmFsc2U7XHJcblx0bmV3VXVpZDogdXVpZCA9ICcnO1xyXG5cclxuXHRzaG93RmFrZUxhZGRlciA9IGZhbHNlO1xyXG5cdEBWdWVUZW1wbGF0ZVxyXG5cdGdldCBfdCgpIHtcclxuXHRcdHJldHVybiBgXHJcblx0XHRcdDxBUFA+XHJcblx0XHRcdFx0PGEtc3BhY2U+XHJcblx0XHRcdFx0XHQ8YS1idXR0b24gdi1pZj1cIiR7IXRoaXMuc29ja2V0LnN0YXRlLmNvbm5lY3RlZH1cIlxyXG5cdFx0XHRcdFx0XHQ6bG9hZGluZz1cIiR7dGhpcy5zb2NrZXQuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZH1cIlxyXG5cdFx0XHRcdFx0XHRAY2xpY2s9XCIke3RoaXMuY29ubmVjdFNvY2tldCgpfVwiXHJcblx0XHRcdFx0XHRcdD4gQ29ubmVjdCBTb2NrZXQgPC9hLWJ1dHRvbj5cclxuXHRcdFx0XHRcdDxhLWJ1dHRvbiB2LWlmPVwiJHshdGhpcy5sYWRkZXIuc3RhdGUuY29ubmVjdGVkfVwiXHJcblx0XHRcdFx0XHRcdDpkaXNhYmxlZD1cIiR7IXRoaXMuc29ja2V0LnN0YXRlLmNvbm5lY3RlZH1cIlxyXG5cdFx0XHRcdFx0XHQ6bG9hZGluZz1cIiR7dGhpcy5sYWRkZXIuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZH1cIlxyXG5cdFx0XHRcdFx0XHRAY2xpY2s9XCIke3RoaXMuY29ubmVjdExhZGRlcigpfVwiXHJcblx0XHRcdFx0XHRcdD4gQ29ubmVjdCBMYWRkZXIgPC9hLWJ1dHRvbj5cclxuXHRcdFx0XHRcdDxhLWJ1dHRvbiB2LWlmPVwiJHshdGhpcy5jaGF0LnN0YXRlLmNvbm5lY3RlZCAmJiAhdGhpcy5zaG93RmFrZUxhZGRlcn1cIlxyXG5cdFx0XHRcdFx0XHQ6ZGlzYWJsZWQ9XCIkeyF0aGlzLnNvY2tldC5zdGF0ZS5jb25uZWN0ZWR9XCJcclxuXHRcdFx0XHRcdFx0OmxvYWRpbmc9XCIke3RoaXMuY2hhdC5zdGF0ZS5jb25uZWN0aW9uUmVxdWVzdGVkfVwiXHJcblx0XHRcdFx0XHRcdEBjbGljaz1cIiR7dGhpcy5jb25uZWN0Q2hhdCgpfVwiXHJcblx0XHRcdFx0XHRcdD4gQ29ubmVjdCBDaGF0IDwvYS1idXR0b24+XHJcblx0XHRcdFx0XHQ8YS1idXR0b24gdi1pZj1cIiR7IXRoaXMuY2hhdC5zdGF0ZS5jb25uZWN0ZWQgJiYgIXRoaXMuc2hvd0Zha2VMYWRkZXJ9XCJcclxuXHRcdFx0XHRcdFx0OmRpc2FibGVkPVwiJHshdGhpcy5sYWRkZXIuc3RhdGUuY29ubmVjdGVkfVwiXHJcblx0XHRcdFx0XHRcdEBjbGljaz1cIiR7dGhpcy5zaG93RmFrZUxhZGRlciA9IHRydWV9XCJcclxuXHRcdFx0XHRcdFx0PiBMYWRkZXIgZGVidWcgdG9vbHMgPC9hLWJ1dHRvbj5cclxuXHRcdFx0XHRcdDxhLWJ1dHRvbiB2LWlmPVwiJHshdGhpcy5jaGF0LnN0YXRlLmNvbm5lY3RlZCAmJiAhdGhpcy5sYWRkZXIuc3RhdGUuY29ubmVjdGVkfVwiXHJcblx0XHRcdFx0XHRcdEBjbGljaz1cIiR7dGhpcy5sb2FkRmFrZUxhZGRlcigpfVwiXHJcblx0XHRcdFx0XHRcdD4gTG9hZCBmYWtlIGxhZGRlciA8L2EtYnV0dG9uPlxyXG5cdFx0XHRcdDwvYS1zcGFjZT5cclxuXHRcdFx0XHQ8YS1yb3c+XHJcblx0XHRcdFx0XHQ8YS1jb2wgc3Bhbj1cIjE0XCI+XHJcblx0XHRcdFx0XHRcdDxGYWlyTGFkZGVyVnVlIHYtaWY9XCIke3RoaXMubGFkZGVyLnN0YXRlLmNvbm5lY3RlZH1cIiA6bGFkZGVyPVwiJHt0aGlzLmxhZGRlcn1cIiAvPlxyXG5cdFx0XHRcdFx0PC9hLWNvbD5cclxuXHRcdFx0XHRcdDxhLWNvbCBzcGFuPVwiMTBcIj5cclxuXHRcdFx0XHRcdFx0PEZhaXJDaGF0VnVlIHYtaWY9XCIke3RoaXMuY2hhdC5zdGF0ZS5jb25uZWN0ZWR9XCIgOmNoYXQ9XCIke3RoaXMuY2hhdH1cIiA6bGFkZGVyPVwiJHt0aGlzLmxhZGRlcn1cIiAvPlxyXG5cclxuXHRcdFx0XHRcdFx0PExhZGRlclRlc3RlclZ1ZSB2LWlmPVwiJHt0aGlzLnNob3dGYWtlTGFkZGVyfVwiIDpsYWRkZXI9XCIke3RoaXMubGFkZGVyfVwiIC8+XHJcblx0XHRcdFx0XHQ8L2EtY29sPlxyXG5cdFx0XHRcdDwvYS1yb3c+XHJcblx0XHRcdFx0PGEtbW9kYWxcclxuXHRcdFx0XHRcdFx0di1tb2RlbDp2aXNpYmxlPVwiJHt0aGlzLmltcG9ydE1vZGFsT3BlbmVkfVwiXHJcblx0XHRcdFx0XHRcdHRpdGxlPVwiVVVJRCBpbXBvcnRcIlxyXG5cdFx0XHRcdFx0XHRAb2s9XCIke3RoaXMuY29uZmlybVV1aWRJbXBvcnQoKX1cIlxyXG5cdFx0XHRcdFx0XHQ+XHJcblx0XHRcdFx0XHRUaGlzIGNsaWVudCBkb2VzIG5vdCBzdXBwb3J0IG1ha2luZyBpdHMgb3duIHV1aWRzXHJcblx0XHRcdFx0XHQ8YnI+XHJcblx0XHRcdFx0XHRQbGVhc2UgcGFzdGUgeW91ciBVVUlEXHJcblx0XHRcdFx0XHQ8YS1pbnB1dCByZWY9XCJlbE5ld1V1aWRJbnB1dFwiIHYtbW9kZWw6dmFsdWU9XCIke3RoaXMubmV3VXVpZH1cIiBAcHJlc3NFbnRlcj1cIiR7dGhpcy5jb25maXJtVXVpZEltcG9ydCgpfVwiIG1heGxlbmd0aD1cIjM2XCIgLz5cclxuXHRcdFx0XHQ8L2EtbW9kYWw+XHJcblxyXG5cdFx0XHQ8L0FQUD5cclxuXHRcdGA7XHJcblx0fVxyXG5cdG1vdW50ZWQoKSB7XHJcblx0XHRpZiAoIXRoaXMudXNlckRhdGEudXVpZCkge1xyXG5cdFx0XHR0aGlzLmltcG9ydE1vZGFsT3BlbmVkID0gdHJ1ZTtcclxuXHRcdH1cclxuXHR9XHJcblx0Y29uZmlybVV1aWRJbXBvcnQoKSB7XHJcblx0XHRpZiAodGhpcy5uZXdVdWlkLm1hdGNoKC8uLi4uLi4uLi0uLi4uLS4uLi4tLi4uLi0uLi4uLi4uLi4uLi4vKSkge1xyXG5cdFx0XHR0aGlzLnVzZXJEYXRhLnV1aWQgPSB0aGlzLm5ld1V1aWQ7XHJcblx0XHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKCd1dWlkJywgdGhpcy5uZXdVdWlkKTtcclxuXHRcdFx0dGhpcy5pbXBvcnRNb2RhbE9wZW5lZCA9IGZhbHNlO1xyXG5cdFx0XHRsb2NhdGlvbi5yZWxvYWQoKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMuaW1wb3J0TW9kYWxPcGVuZWQgPSB0cnVlO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRhc3luYyBjb25uZWN0U29ja2V0KCkge1xyXG5cdFx0YXdhaXQgc29ja2V0LmNvbm5lY3QoKTtcclxuXHR9XHJcblx0YXN5bmMgY29ubmVjdENoYXQoKSB7XHJcblx0XHRsZXQgY2hhdCA9IFZ1ZS50b1Jhdyh0aGlzLmNoYXQpO1xyXG5cdFx0Y2hhdC5zdGF0ZS5jb25uZWN0aW9uUmVxdWVzdGVkID0gdHJ1ZTtcclxuXHRcdGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCA1MDApKTtcclxuXHRcdGNoYXQuc3RhdGUuY29ubmVjdGlvblJlcXVlc3RlZCA9IGZhbHNlO1xyXG5cdFx0YXdhaXQgY2hhdC5jb25uZWN0KCk7XHJcblx0fVxyXG5cdGFzeW5jIGNvbm5lY3RMYWRkZXIoKSB7XHJcblx0XHRsZXQgbGFkZGVyID0gVnVlLnRvUmF3KHRoaXMubGFkZGVyKTtcclxuXHRcdGxhZGRlci5zdGF0ZS5jb25uZWN0aW9uUmVxdWVzdGVkID0gdHJ1ZTtcclxuXHRcdGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCA1MDApKTtcclxuXHRcdGxhZGRlci5zdGF0ZS5jb25uZWN0aW9uUmVxdWVzdGVkID0gZmFsc2U7XHJcblx0XHRhd2FpdCBsYWRkZXIuY29ubmVjdCgpO1xyXG5cdFx0YW50ZC5tZXNzYWdlLmluZm8oYENoZWNrIG91dCB0aGUgXCJDZW50ZXIgeW91cnNlbGZcIiBmaWx0ZXIgaW4gVXNlcm5hbWUgY29sdW1uIWApO1xyXG5cdH1cclxuXHRsb2FkRmFrZUxhZGRlcigpIHtcclxuXHRcdGxldCBfbCA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oJ19sYWRkZXInKSEpO1xyXG5cdFx0bGFkZGVyLmhhbmRsZUxhZGRlckluaXQoX2wgYXMgYW55KTtcclxuXHR9XHJcbn1cclxuXHJcbmxldCBhcHAgPSBWdWUuY3JlYXRlQXBwKEFwcFZ1ZSwge1xyXG5cdHNvY2tldCxcclxuXHRjaGF0LFxyXG5cdGxhZGRlcixcclxuXHR1c2VyRGF0YSxcclxufSkudXNlKFZ1ZVByb3BEZWNvcmF0b3JBVmFyaWF0aW9uLmN1c3RvbSlcclxuXHQudXNlKFZ1ZVByb3BEZWNvcmF0b3JBVmFyaWF0aW9uLmtub3duKVxyXG5cdC51c2UoYW50ZCk7XHJcbmFwcC5tb3VudCgnI2FwcCcpO1xyXG4iXX0=