const API = (() => {
    const URL = "http://localhost:3000";
  
    const getCart = async () => {
      const response = await fetch(`${URL}/cart`);
      const data = await response.json();
      console.log(data, "response");
      return data;
    };
  
    const getInventory = async () => {
      const response = await fetch(`${URL}/inventory`);
      const data = await response.json();
      console.log(data, "response");
      return data;
    };
  
    const addToCart = async (item) => {
      const response = await fetch(`${URL}/cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      return response.json();
    };
  
    const updateCart = async (id, newAmount) => {
      const response = await fetch(`${URL}/cart/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: newAmount }),
      });
      return response.json();
    };
  
    const deleteFromCart = async (id) => {
      await fetch(`${URL}/cart/${id}`, { method: "DELETE" });
    };
  
    const checkout = () => {
      return getCart().then((data) =>
        Promise.all(data.map((item) => deleteFromCart(item.id)))
      );
    };
  
    return { getCart, getInventory, addToCart, updateCart, deleteFromCart, checkout };
  })();
  
  const Model = (() => {
    class State {
      constructor() {
        this.cart = [];
        this.inventory = [];
        this.editingId = null;
        this.onChange = () => {};
      }
  
      subscribe(cb) {
        this.onChange = cb;
      }
  
      setCart(newCart) {
        this.cart = newCart;
        this.onChange();
      }
  
      setInventory(newInventory) {
        this.inventory = newInventory;
        this.onChange();
      }
  
      setEditingId(id) {
        this.editingId = id;
        this.onChange();
      }
    }
  
    return { State, ...API };
  })();
  
  const View = (() => {
    console.log("Hi");
    const renderInventory = (inventory) => {
    //  inventorty_data =  API.getInventory();
      const inventoryList = document.querySelector(".inventory__list");
      inventoryList.innerHTML = inventory
        .map(
          (item) => `
            <li class="inventory-item">
              <span class="item-content">${item.content}</span>
              <div class="controls">
                <button class="minus-btn" data-id="${item.id}">-</button>
                <span class="amount">${item.amount || 0}</span>
                <button class="plus-btn" data-id="${item.id}">+</button>
                <button class="add-btn" data-id="${item.id}">add to cart</button>
              </div>
            </li>
          `
        )
        .join("");
    };
  
    const renderCart = (cart, editingId) => {
        console.log("Rendering cart with editingId:", editingId);
        const cartList = document.querySelector(".cart__list");
        cartList.innerHTML = cart
          .map(
            (item) => `
              <li class="cart-item">
                ${
                  parseInt(item.id) === parseInt(editingId)
                    ? `
                      <span class="item-content">${item.content}</span>
                      <div class="edit-controls">
                        <button class="minus-btn" data-id="${item.id}">-</button>
                        <span class="amount">${item.amount}</span>
                        <button class="plus-btn" data-id="${item.id}">+</button>
                        <button class="save-btn" data-id="${item.id}">save</button>
                      </div>
                    `
                    : `
                      <span class="item-content">${item.content} x ${item.amount}</span>
                      <div class="controls">
                        <button class="edit-btn" data-id="${item.id}">edit</button>
                        <button class="delete-btn" data-id="${item.id}">delete</button>
                      </div>
                    `
                }
              </li>
            `
          )
          .join("");
      };
    
    return { renderInventory, renderCart };
  })();
  
  const Controller = ((model, view) => {
    const state = new model.State();
  
    const init = async () => {
      const inventory = await model.getInventory();
      const cart = await model.getCart();
      
      // Initialize inventory items with amount = 0
      const inventoryWithAmounts = inventory.map(item => ({
        ...item,
        amount: 0
      }));
      
      state.setInventory(inventoryWithAmounts);
      state.setCart(cart);
      addEventListeners();
    };
  
    const addEventListeners = () => {
      document.querySelector(".inventory__list").addEventListener("click", (e) => {
        const id = e.target.dataset.id;
        if (!id) return;
  
        if (e.target.classList.contains("plus-btn")) {
          const item = state.inventory.find((item) => item.id == id);
          item.amount = (item.amount || 0) + 1;
          state.setInventory([...state.inventory]);
        }
  
        if (e.target.classList.contains("minus-btn")) {
          const item = state.inventory.find((item) => item.id == id);
          if (item.amount > 0) {
            item.amount -= 1;
            state.setInventory([...state.inventory]);
          }
        }
  
        if (e.target.classList.contains("add-btn")) {
          const item = state.inventory.find((item) => item.id == id);
          if (item.amount > 0) {
            const existingCartItem = state.cart.find(
              (cartItem) => cartItem.id == id
            );
  
            if (existingCartItem) {
              model
                .updateCart(id, existingCartItem.amount + item.amount)
                .then((updatedItem) => {
                  state.setCart(
                    state.cart.map((cartItem) =>
                      cartItem.id == id ? updatedItem : cartItem
                    )
                  );
                });
            } else {
              model
                .addToCart({ ...item, amount: item.amount })
                .then((newCartItem) => {
                  state.setCart([...state.cart, newCartItem]);
                });
            }
            item.amount = 0;
            state.setInventory([...state.inventory]);
          }
        }
      });
  
      document.querySelector(".cart__list").addEventListener("click", (e) => {
        const id = e.target.dataset.id;
        if (!id) return;
  
        if (e.target.classList.contains("delete-btn")) {
          model.deleteFromCart(id).then(() => {
            state.setCart(state.cart.filter((item) => item.id != id));
          });
        }
  
        if (e.target.classList.contains("edit-btn")) {
          state.setEditingId(id);
        }
  
        if (e.target.classList.contains("save-btn")) {
          const item = state.cart.find((item) => item.id == id);
          model.updateCart(id, item.amount).then(() => {
            state.setEditingId(null);
          });
        }
  
        if (e.target.classList.contains("plus-btn")) {
          const item = state.cart.find((item) => item.id == id);
          item.amount += 1;
          state.setCart([...state.cart]);
        }
  
        if (e.target.classList.contains("minus-btn")) {
          const item = state.cart.find((item) => item.id == id);
          if (item.amount > 1) {
            item.amount -= 1;
            state.setCart([...state.cart]);
          }
        }
      });
  
      document.querySelector(".checkout-btn").addEventListener("click", () => {
        alert("checkout"); 
        model.checkout().then(() => {
          state.setCart([]);
        });
      });
    };
  
    state.subscribe(() => {
      view.renderInventory(state.inventory);
      view.renderCart(state.cart, state.editingId);
    });
  
    return { init };
  })(Model, View);
  
  Controller.init();
