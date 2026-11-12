class ServerList {
  constructor() {
    this.servers = [];
    this.server_list_reorder_requested = false;

    this.default_reconnect_delay_ms = 5_000; // 5 seconds
    this.max_reconnect_delay_ms = 1_000 * 60 * 3; // 3 minutes
    this.reconnect_delay_ms = 0;

    this.host_element = document.querySelector("#host");

    this.setup_websocket();

    setInterval(this.update.bind(this), 1_000);
  }

  setup_websocket() {
    this.websocket = new WebSocket("wss://gsh.w3d.cyberarm.dev/api/websocket");

    this.websocket.addEventListener("open", (event) => {
      this.reconnect_delay_ms = 0;

      // Send handshake
      this.websocket.send("{ \"protocol_version\": 1 }");
    });

    this.websocket.addEventListener("message", (event) => {
      this.handle_websocket(event);
    });

    this.websocket.addEventListener("close", (event) => {
      if (this.reconnect_delay_ms === 0) {
        this.reconnect_delay_ms = this.default_reconnect_delay_ms;
      } else {
        this.reconnect_delay_ms *= 2;
        if (this.reconnect_delay_ms > this.max_reconnect_delay_ms) {
          this.reconnect_delay_ms = this.max_reconnect_delay_ms;
        }
      }

      setTimeout(this.setup_websocket(), this.reconnect_delay_ms);
    });
  }

  update() {
    if (this.server_list_reorder_requested) {
      this.server_list_reorder_requested = false;

      [...this.host_element.children].sort((a, b) => {
        let element_a = a.querySelector("[data-players]")
        let element_b = b.querySelector("[data-players]")

        return parseInt(element_a.dataset["players"]) < parseInt(element_b.dataset["players"]);
      }).forEach((child) => {
        this.host_element.appendChild(child);
      });
    }
  }

  handle_websocket(event) {
    let data = JSON.parse(event.data);

    switch (data.type) {
      case "ping": {
        this.websocket.send('{ "type": "pong", "data": "" }')

        break;
      }

      case "server_list": {
        this.host_element.innerHTML = "";
        data.data.sort((a, b) => { return a.status.numplayers < b.status.numplayers }).forEach((hash) => {
          this.add_server_item(hash);
        });

        this.servers = data.data;
        break;
      }

      case "server_added", "server_updated": {
        this.update_server_item(data.data);
        break;
      }

      case "server_removed": {
        this.remove_server_item(data.data);
        break;
      }

      default: {
        console.log("Unhandled event", data.type);

        break;
      }
    }
  }

  add_server_item(hash) {
    let card = document.createElement("div");
    card.classList.add("card", "server-row", "row");
    card.dataset["uuid"] = hash.id;

    let app_icon = document.createElement("img");
    app_icon.classList.add("icon");
    app_icon.srcset = `/media/images/${hash.game}/icon.webp`;
    app_icon.dataset["icon"] = hash.game;

    let server_info = document.createElement("div");
    server_info.classList.add("grow", "clip-text");
    let server_info_label = document.createElement("strong");
    server_info_label.dataset["name"] = hash.status.name;
    server_info_label.innerText = hash.status.name;
    let server_info_value = document.createElement("p");
    server_info_value.dataset["map"] = hash.status.map;
    server_info_value.innerText = hash.status.map;
    server_info.appendChild(server_info_label);
    server_info.appendChild(server_info_value);

    let player_info = document.createElement("div");
    let player_info_label = document.createElement("strong");
    player_info_label.innerText = "Players";
    let player_info_value = document.createElement("p");
    player_info_value.dataset["players"] = `${hash.status.numplayers}`;
    player_info_value.dataset["max_players"] = `${hash.status.maxplayers}`;
    player_info_value.innerText = `${hash.status.numplayers}/${hash.status.maxplayers}`;
    player_info.appendChild(player_info_label);
    player_info.appendChild(player_info_value);

    card.appendChild(app_icon);
    card.appendChild(server_info);
    card.appendChild(player_info);

    this.host_element.appendChild(card);
  }

  update_server_item(hash) {
    let element = this.host_element.querySelector(`[data-uuid="${hash.id}"`);
    if (!element) {
      this.add_server_item(hash)
      return;
    }

    // Update ICON
    let app_icon = element.querySelector('[data-icon]');
    if (app_icon.dataset["icon"] !== hash.game) {
      app_icon.dataset["icon"] = hash.game;
      app_icon.srcset = `/media/images/${hash.game}/icon.webp`;
    }

    // Update NAME
    let server_info_label = element.querySelector('[data-name]');
    if (server_info_label.dataset["name"] !== hash.status.name) {
      app_icon.dataset["name"] = hash.status.name;
      app_icon.innerText = hash.status.name;
    }

    // Update MAP
    let server_info_value = element.querySelector('[data-map]');
    if (server_info_value.dataset["map"] !== hash.status.map) {
      server_info_value.dataset["map"] = hash.status.map;
      server_info_value.innerText = hash.status.map;
    }

    // Update PLAYERS
    let player_info_value = element.querySelector('[data-players]');
    if (player_info_value.dataset["players"] !== `${hash.status.numplayers}`) {
      this.server_list_reorder_requested = true;

      player_info_value.dataset["players"] = `${hash.status.numplayers}`;
      player_info_value.innerText = `${hash.status.numplayers}/${hash.status.maxplayers}`;
    }
  }

  remove_server_item(hash) {
    let card = this.host_element.querySelector(`[data-uuid="${hash.id}"]`)
    if (card) {
      this.host_element.removeChild(card);
    }
  }
};

window.addEventListener("load", (e) => {
  new ServerList();
});
