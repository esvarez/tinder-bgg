import { PagePlaceholder } from '../components/PagePlaceholder';

export function CollectionPage() {
  return (
    <PagePlaceholder
      title="Collection"
      description="The games you own, with filters and sorting."
      issue="#19"
    />
  );
}

export function AddGamePage() {
  return (
    <PagePlaceholder
      title="Add game"
      description="Search BoardGameGeek and add a game to your collection."
      issue="#18"
    />
  );
}

export function DuelPage() {
  return (
    <PagePlaceholder
      title="Duel"
      description="Pick the better of two games to build your ranking."
      issue="#29"
    />
  );
}

export function RankingPage() {
  return (
    <PagePlaceholder title="Ranking" description="Your games from best to worst." issue="#30" />
  );
}

export function StatsPage() {
  return (
    <PagePlaceholder
      title="Stats"
      description="Numbers about your collection and duels."
      issue="#35"
    />
  );
}

export function LoginPage() {
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <PagePlaceholder title="Log in" description="Sign in to see your collection." issue="#37" />
    </main>
  );
}

export function NotFoundPage() {
  return (
    <PagePlaceholder
      title="Page not found"
      description="There is nothing at this address."
      issue="n/a"
    />
  );
}
