import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const cartAux = [...cart];
      const productFound = cartAux.find(p => p.id === productId);

      const stock = await api.get(`stock/${productId}`);
      const currentAmount = productFound ? productFound.amount : 0;
      const amount = currentAmount + 1;

      if (amount > stock.data.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (!productFound) {
        const response = await api.get<Product>(`products/${productId}`);

        const newProduct = { ...response.data, amount: 1 }
        cartAux.push(newProduct);
      } else {
        productFound.amount = amount;
      }
      setCart(cartAux);

      const cartString = JSON.stringify(cartAux);
      localStorage.setItem('@RocketShoes:cart', cartString)
      toast.success(`😄 Added id ${productId} to Cart!`);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      let cartAux = [...cart];
      const productFound = cartAux.find(p => p.id === productId);
      if (!productFound) {
        throw Error();
      }
      cartAux = cartAux.filter(product => product.id !== productId);
      setCart(cartAux);

      const cartString = JSON.stringify(cartAux);
      localStorage.setItem('@RocketShoes:cart', cartString)
      toast.success(`🗑 Removed id ${productId} to Cart!`);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }
      if ((await api.get(`/stock/${productId}`)).data.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const cartAux = [...cart];
      const productFound = cartAux.find(p => p.id === productId);
      if (!productFound) {
        toast.error('Produto não encontrado');
        return;
      }

      productFound.amount = amount;
      setCart(cartAux);

      const cartString = JSON.stringify(cartAux);
      localStorage.setItem('@RocketShoes:cart', cartString)
      toast.success(`😉 Changed amount of id ${productId} to  ${amount}!`);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
