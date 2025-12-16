import { Container, Text } from '../components/themed';

export default function Calendar() {
  return (
    <Container variant="primary" padding="lg">
      <Text as="h1" variant="primary">Calendar</Text>
      <Text as="p" variant="secondary">Calendar page content goes here.</Text>
    </Container>
  );
}
