from django.db import models
from django.contrib.auth.models import AbstractUser
from django.templatetags.static import static
from ckeditor.fields import RichTextField
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.translation import gettext_lazy as _
import os

class Member(AbstractUser):
    USER_LEVELS = (
        ('admin', '管理員'),
        ('editor', '編輯'),
        ('user', '用戶'),
    )

    full_name = models.CharField(max_length=255, unique=True, blank=True, null=True, verbose_name='全名')
    google_id = models.CharField(max_length=255, blank=True, null=True, verbose_name='Google ID')
    level = models.CharField(max_length=10, choices=USER_LEVELS, default='user', verbose_name='等級')
    avatar = models.ImageField(
        upload_to='avatars/%Y/%m/%d/',  # 按日期組織文件
        blank=True,
        null=True,
        verbose_name='頭像',
        help_text='支持 jpg、jpeg、png 格式，文件大小不超過 2MB'
    )
    favorite_restaurants = models.ManyToManyField('Restaurant', related_name='favorited_by', blank=True, verbose_name='喜愛的餐廳')
    favorite_products = models.ManyToManyField('Product', related_name='favorited_by', blank=True, verbose_name='喜愛的商品')
    address = models.CharField(max_length=255, blank=True, null=True, verbose_name='地址')

    def get_avatar_url(self):
        if self.avatar and hasattr(self.avatar, 'url'):
            # 確保返回的 URL 使用正斜線
            return self.avatar.url.replace('\\', '/')
        return static('img/ex1.jpg')  # 使用 ex1.jpg 作為預設頭像

    def save(self, *args, **kwargs):
        # 如果上傳了新頭像，刪除舊頭像
        if self.pk:
            try:
                old_instance = Member.objects.get(pk=self.pk)
                if old_instance.avatar and self.avatar != old_instance.avatar:
                    # 確保文件存在且不是預設頭像
                    if os.path.isfile(old_instance.avatar.path):
                        os.remove(old_instance.avatar.path)
            except (Member.DoesNotExist, ValueError, OSError):
                pass  # 忽略任何錯誤
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = '會員'
        verbose_name_plural = '會員'

class Article(models.Model):
    title = models.CharField(max_length=200, verbose_name='標題')
    content = models.TextField(verbose_name='內容')
    pub_date = models.DateTimeField('發布日期', auto_now_add=True)
    author = models.ForeignKey(Member, on_delete=models.SET_NULL, null=True, blank=True, related_name='articles', verbose_name='作者')

    def __str__(self):
        return self.title

    def get_author_name(self):
        return self.author.username if self.author else "匿名"

    class Meta:
        verbose_name = '文章'
        verbose_name_plural = '文章'

class Message(models.Model):
    sender = models.ForeignKey(Member, related_name='sent_messages', on_delete=models.CASCADE, verbose_name='寄件人')
    recipient = models.ForeignKey(Member, related_name='received_messages', on_delete=models.CASCADE, verbose_name='收件人')
    subject = models.CharField(max_length=255, verbose_name='主題')
    content = RichTextField(verbose_name='內容')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='創建時間')
    is_read = models.BooleanField(default=False, verbose_name='是否已讀')
    quoted_message = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='quotes', verbose_name='引用訊息')

    def __str__(self):
        return f"{self.sender} 給 {self.recipient}: {self.subject}"

    class Meta:
        ordering = ['-created_at']
        verbose_name = '訊息'
        verbose_name_plural = '訊息'

class Restaurant(models.Model):
    name = models.CharField(max_length=200, verbose_name='名稱')
    cuisine = models.CharField(max_length=100, verbose_name='菜系')
    address = models.CharField(max_length=255, verbose_name='地址')
    rating = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True, verbose_name='評分')

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = '餐廳'
        verbose_name_plural = '餐廳'

class Product(models.Model):
    name = models.CharField(max_length=200, verbose_name='名稱')
    category = models.CharField(max_length=100, verbose_name='類別')
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='價格')
    description = RichTextField(blank=True, verbose_name='描述')
    image = models.ImageField(upload_to='products/', blank=True, null=True, verbose_name='商品圖片')
    stock = models.PositiveIntegerField(default=0, verbose_name='庫存')
    is_active = models.BooleanField(default=True, verbose_name='是否上架')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='創建時間')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新時間')

    def __str__(self):
        return self.name

    def get_image_url(self):
        if self.image:
            return self.image.url
        return static('img/no-image.jpg')  # 預設商品圖片

    class Meta:
        verbose_name = '商品'
        verbose_name_plural = '商品'
        ordering = ['-created_at']

class Review(models.Model):
    RATING_CHOICES = (
        (1, '1星'),
        (2, '2星'),
        (3, '3星'),
        (4, '4星'),
        (5, '5星'),
    )
    user = models.ForeignKey(Member, on_delete=models.CASCADE, verbose_name='用戶')
    content = models.TextField(verbose_name='內容')
    rating = models.IntegerField(choices=RATING_CHOICES, validators=[MinValueValidator(1), MaxValueValidator(5)], verbose_name='評分')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='創建時間')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新時間')

    class Meta:
        abstract = True

class ProductReview(Review):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews', verbose_name='商品')
    user = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='product_reviews', verbose_name='用戶')

    class Meta:
        verbose_name = '商品評論'
        verbose_name_plural = '商品評論'

class ArticleReview(Review):
    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name='reviews', verbose_name='文章')
    user = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='article_reviews', verbose_name='用戶')

    class Meta:
        verbose_name = '文章評論'
        verbose_name_plural = '文章評論'

class RestaurantReview(Review):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='reviews', verbose_name='餐廳')
    user = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='restaurant_reviews', verbose_name='用戶')

    class Meta:
        verbose_name = '餐廳評論'
        verbose_name_plural = '餐廳評論'

class Cart(models.Model):
    user = models.ForeignKey('Member', on_delete=models.CASCADE, related_name='cart_items')
    product = models.ForeignKey('Product', on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = _('購物車項目')
        verbose_name_plural = _('購物車項目')

    def __str__(self):
        return f"{self.user.username} - {self.product.name} ({self.quantity})"

    @property
    def total_price(self):
        return self.quantity * self.product.price