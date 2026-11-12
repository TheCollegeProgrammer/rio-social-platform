const postImages = (post) =>
    post.images?.length ? post.images : post.image ? [post.image] : [];

module.exports = { postImages };
