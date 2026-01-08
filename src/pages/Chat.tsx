import { useIsMobile } from '../hooks/useMediaQuery';
import { ChatContainer } from '../components/chat';
import MobileChat from '../components/mobile/MobileChat';
import '../styles/chat.css';

export default function Chat() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileChat />;
  }

  return <ChatContainer />;
}
