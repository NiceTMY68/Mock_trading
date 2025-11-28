import PageLayout from '../components/layout/PageLayout';
import PostList from '../components/community/PostList';

const CommunityPage = () => {
  return (
    <PageLayout>
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <PostList />
      </main>
    </PageLayout>
  );
};

export default CommunityPage;

