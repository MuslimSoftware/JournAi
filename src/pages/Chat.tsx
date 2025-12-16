import { Container, Text } from '../components/themed';

export default function Chat() {
  return (
    <Container variant="primary" padding="lg">
      <Text as="h1" variant="primary">Chat</Text>
      <Text as="p" variant="secondary">Chat page content goes here.</Text>
    </Container>
  );
}
