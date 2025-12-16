import { Container, Text } from '../components/themed';

export default function Entries() {
  return (
    <Container variant="primary" padding="lg">
      <Text as="h1" variant="primary">Entries</Text>
      <Text as="p" variant="secondary">Entries page content goes here.</Text>
    </Container>
  );
}
