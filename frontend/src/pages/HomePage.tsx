import { EventTypes } from '../features/home/EventTypes';
import { Features } from '../features/home/Features';
import { Hero } from '../features/home/Hero';

export function HomePage() {
  return (
    <>
      <Hero />
      <EventTypes />
      <Features />
    </>
  );
}
