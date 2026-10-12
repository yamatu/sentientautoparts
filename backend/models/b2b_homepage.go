package models

import (
	"gorm.io/datatypes"
	"strings"
)

// Virtual defaults are merged only when a key has never been saved. Explicitly
// disabled or cleared records always win; no seed overwrites operator content.
func B2BHomepageDefaults() []HomepageContent {
	return []HomepageContent{
		{SectionKey: "hero_section", Title: "The right A/C part. A clearer way to find it.", Subtitle: "AUTOMOTIVE AIR CONDITIONING", Description: "Browse automotive A/C parts by OE reference and vehicle application. Contact our team for a fitment check and quotation.", ImageURL: "/legacy/theme/images/pro1.png", ButtonText: "Find your part", ButtonURL: "/products", Data: datatypes.JSON(`{"secondary_text":"Download catalog","secondary_url":"/download","show_stats":true}`), SortOrder: 10, IsActive: true},
		{SectionKey: "search_section", Title: "Find your part", Subtitle: "OE number, ST code or vehicle model", Description: "e.g. 88320-0C010 or Land Cruiser", ButtonText: "Search parts", SortOrder: 20, IsActive: true},
		{SectionKey: "product_range", Title: "Made for automotive cooling", Subtitle: "PRODUCT RANGE", ButtonText: "Explore all products", ButtonURL: "/products", SortOrder: 30, IsActive: true},
		{SectionKey: "vehicle_makes", Title: "Browse by vehicle make", Subtitle: "VEHICLE APPLICATIONS", Description: "Vehicle makes describe application, not the part manufacturer.", SortOrder: 40, IsActive: true},
		{SectionKey: "featured_products", Title: "Explore A/C compressors", Subtitle: "FROM OUR CATALOG", ButtonText: "View catalog", ButtonURL: "/products", Data: datatypes.JSON(`{"limit":8,"mode":"latest"}`), SortOrder: 50, IsActive: true},
		{SectionKey: "advantages_section", Title: "WHY SENTIENT?", Subtitle: "WHY CHOOSE US", SortOrder: 60, IsActive: true},
		{SectionKey: "home_banners", Title: "Featured information", Subtitle: "HIGHLIGHTS", SortOrder: 70, IsActive: false},
		{SectionKey: "home_news", Title: "Insights & news", Subtitle: "LATEST UPDATES", ButtonText: "View all news", ButtonURL: "/news", Data: datatypes.JSON(`{"limit":3}`), SortOrder: 80, IsActive: false},
		{SectionKey: "inquiry_section", Title: "Have an OE number or a vehicle application?", Subtitle: "LET’S FIND THE RIGHT PART", Description: "Send your part references and requirements for a fitment check and quotation.", ButtonText: "Send an inquiry", ButtonURL: "/contact_us", SortOrder: 90, IsActive: true},
		{SectionKey: "about_content", Title: "About us", SortOrder: 100, IsActive: false},
	}
}

func B2BHomepageSections() []HomepageSection {
	return []HomepageSection{
		{Key: "hero_section", Name: "首页主视觉 / Hero", Description: "标题、眉题、正文、图片、主/次按钮、实时目录统计"},
		{Key: "search_section", Name: "产品搜索 / Search", Description: "首页 OE/ST/车型搜索文案"},
		{Key: "product_range", Name: "配件分类 / Product range", Description: "实时分类卡片；图片/数量来自分类管理"},
		{Key: "vehicle_makes", Name: "车厂筛选 / Vehicle makes", Description: "实时车厂入口与说明"},
		{Key: "featured_products", Name: "产品推荐 / Products", Description: "最新或后台标为推荐的产品，可配置显示数量"},
		{Key: "advantages_section", Name: "企业优势 / Advantages", Description: "优势区标题，卡片使用 advantage_* 区块"},
		{Key: "home_banners", Name: "首页横幅 / Banners", Description: "横幅管理中 home 位置、已启用且在有效期内的横幅"},
		{Key: "home_news", Name: "首页新闻 / News", Description: "最近发布文章及显示数量"},
		{Key: "inquiry_section", Name: "询盘行动区 / Inquiry CTA", Description: "首页及内页底部的通用询盘提示和按钮"},
		{Key: "about_content", Name: "公司介绍 / About", Description: "/about 页面内容，不参与首页排序"},
	}
}
func IsB2BHomepageKey(key string) bool {
	for _, item := range B2BHomepageDefaults() {
		if item.SectionKey == key {
			return true
		}
	}
	return strings.HasPrefix(key, "advantage_") || strings.HasPrefix(key, "custom_")
}
