import { CSSProperties } from 'react';
import { useKeyboard } from '../../hooks/useKeyboard';
import { ChatContainer } from '../chat';
import { CHAT } from '../chat/constants';

export default function MobileChat() {
  const { isOpen: isKeyboardOpen } = useKeyboard();

  const inputWrapperStyle: CSSProperties = {
    paddingBottom: isKeyboardOpen ? '0' : 'calc(var(--mobile-safe-area-bottom))',
    transition: `padding-bottom ${CHAT.transition.layout}`,
  };

  return <ChatContainer inputWrapperStyle={inputWrapperStyle} />;
}
