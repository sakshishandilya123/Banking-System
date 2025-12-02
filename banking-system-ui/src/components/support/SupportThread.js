
const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(2,6,23,0.45)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center'
};

const boxStyle = { width: '640px', maxHeight: '80vh', background: '#fff', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #e6edf8' };

const SupportThread = ({ ticketId, onClose }) => {
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const res = await getSupportTicket(ticketId);
      if (!mounted) return;
      if (res.success) {
        setTicket(res.ticket);
        setMessages(res.messages || []);
      import React from 'react';

      // Support thread removed. Export harmless stub.
      const SupportThread = () => null;
      export default SupportThread;
    load();
