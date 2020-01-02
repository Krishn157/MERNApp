const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Profile = require('../../Models/Profile');
const Posts = require('../../Models/Posts');
const User = require('../../Models/User');
const { check, validationResult } = require('express-validator/check');

//@route poST api/post
//@desc Create a post
//@access Private

router.post(
  '/',
  [
    auth,
    [
      check('text', 'text is required')
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const error = validationResult(req);
    if (!error.isEmpty()) {
      return res.status(400).json({ errors: error.array() });
    }
    try {
      const user = await User.findById(req.user.id).select('-password');
      const newPost = new Posts({
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      });
      const post = await newPost.save();
      res.json(post);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

//@route GET api/post
//@desc GET all post
//@access Private
router.get('/', auth, async (re, res) => {
  try {
    const posts = await Posts.find().sort({ date: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

//@route GET api/post/:id
//@desc GET  post by id
//@access Private
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Posts.findById(req.params.id);
    if (!post) return res.status(400).json({ msg: 'Post not found' });
    res.json(post);
  } catch (err) {
    if (err.kind === 'ObjectId')
      return res.status(400).json({ msg: 'Post not found' });
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
//@route DELETE api/post/:id
//@desc DELETE  post by id
//@access Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Posts.findById(req.params.id);
    if (!post) return res.status(400).json({ msg: 'Post not found' });
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    await post.remove();
    res.json({ msg: 'Post removed' });
  } catch (err) {
    if (err.kind === 'ObjectId')
      return res.status(400).json({ msg: 'Post not found' });
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

//@route PUT api/posts/like/:id
//@desc like a post
//@access Private

router.put('/like/:id', auth, async (req, res) => {
  try {
    const post = await Posts.findById(req.params.id);

    //check if the user has already liked the post
    if (
      post.likes.map(like => like.user.toString() === req.user.id).length > 0
    ) {
      return res.status(400).json({ msg: 'Post already liked' });
    }
    post.likes.unshift({ user: req.user.id });
    await post.save();
    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

//@route PUT api/posts/unlike/:id
//@desc unlike a post
//@access Private

router.put('/unlike/:id', auth, async (req, res) => {
  try {
    const post = await Posts.findById(req.params.id);

    //check if the user has  liked the post
    if (
      post.likes.map(like => like.user.toString() === req.user.id).length === 0
    ) {
      return res.status(400).json({ msg: 'Post has not yet been liked' });
    }
    //Get remove index
    const removeIndex = post.likes
      .map(like => like.user.toString())
      .indexOf(req.user.id);
    post.likes.splice(removeIndex, 1);
    await post.save();
    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

//@route poST api/post/comment/:id
//@desc Comment on a post
//@access Private

router.post(
  '/comment/:id',
  [
    auth,
    [
      check('text', 'text is required')
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const error = validationResult(req);
    if (!error.isEmpty()) {
      return res.status(400).json({ errors: error.array() });
    }
    try {
      const user = await User.findById(req.user.id).select('-password');
      const post = await Posts.findById(req.params.id);
      const newComment = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      };
      post.comments.unshift(newComment);
      await post.save();
      res.json(post.comments);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

//@route DELETE api/post/comment/:id/:comment_id
//@desc DELETE comment on a post by id
//@access Private
router.delete('/comment/:id/:comment_id', auth, async (req, res) => {
  try {
    const post = await Posts.findById(req.params.id);
    //Pull out comment
    const comment = post.comments.find(
      comment => comment.id === req.params.comment_id
    );
    //make sure comment exists
    if (!comment) {
      return res.status(404).json({ msg: 'Comment does not exist' });
    }
    //check user
    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    //Get remove index
    const removeIndex = post.comments
      .map(comment => comment.user.toString())
      .indexOf(req.user.id);
    post.comments.splice(removeIndex, 1);
    await post.save();
    res.json(post.comments);
  } catch (err) {
    if (err.kind === 'ObjectId')
      return res.status(400).json({ msg: 'Post not found' });
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
