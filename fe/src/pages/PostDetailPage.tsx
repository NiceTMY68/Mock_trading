import PageLayout from '../components/layout/PageLayout';
import PostDetail from '../components/community/PostDetail';

const PostDetailPage = () => {
  return (
    <PageLayout>
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <PostDetail />
      </main>
    </PageLayout>
  );
};

export default PostDetailPage;

