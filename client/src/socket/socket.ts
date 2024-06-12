import { useTickerStore } from '@/store/ticker.js';
import { priceDirection } from '@/helpers/helpers.js';
import { WebSocketMessage, type StatusType, type TickerData, type WebsocketData } from '@/types/types.js';

const CRYPTO_ENDPOINT = 'wss://ws-feed.exchange.coinbase.com';

export function websocketConnect() {
  const tickerStore = useTickerStore();
  tickerStore.setSocketStatus('CONNECTING' as StatusType);
  const socket = new WebSocket(CRYPTO_ENDPOINT);
  console.log('Socket Created!');

  socket.onopen = () => {
    socket.send(
      JSON.stringify({
        type: 'subscribe',
        product_ids: tickerStore.cryptoTickers,
        channels: [
          'heartbeat',
          {
            name: 'ticker',
            product_ids: tickerStore.cryptoTickers
          }
        ]
      })
    );
    tickerStore.setSocketStatus('CONNECTED');
  };

  socket.onmessage = (e: MessageEvent<unknown>) => {
    const msg = JSON.parse(e.data as string);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (msg['type'] == 'ticker') {
      const socketTicker = msg as WebsocketData;
      const prevRes = tickerStore.tickerValue(socketTicker.product_id);
      const curPrice = parseFloat(socketTicker.price);
      const dayPrice = parseFloat(socketTicker.open_24h);
      const tickerValue = {
        id: socketTicker.product_id,
        curPrice: curPrice,
        volume: parseFloat(socketTicker.volume_24h),
        dayPercentage: ((curPrice - dayPrice) / dayPrice) * 100,
        prevPrice: prevRes.curPrice,
        dirFilter: priceDirection(prevRes.dirFilter, curPrice, prevRes.prevPrice),
        status: 'CONNECTED'
      } as TickerData;
      tickerStore.updateTickerData(socketTicker.product_id, tickerValue);
    }
  };

  socket.onclose = (e) => {
    console.log(e);
    setTimeout(() => {
      tickerStore.setSocketStatus('CONNECTING');
      websocketConnect(); // Reconnect
    }, 60000);
  };

  socket.onerror = (err) => {
    console.log(err);
    tickerStore.setSocketStatus('ERROR');
    socket.close();
  };
}
