package com.dryad.app

import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import com.google.android.gms.ads.nativead.MediaView
import com.google.android.gms.ads.nativead.NativeAd
import com.google.android.gms.ads.nativead.NativeAdView
import io.flutter.plugins.googlemobileads.GoogleMobileAdsPlugin.NativeAdFactory

class DryadNativeAdFactory(private val layoutInflater: LayoutInflater) : NativeAdFactory {
    override fun createNativeAd(nativeAd: NativeAd, customOptions: MutableMap<String, Any>?): NativeAdView {
        val adView = layoutInflater.inflate(R.layout.native_ad, null) as NativeAdView

        adView.headlineView = adView.findViewById(R.id.ad_headline)
        adView.bodyView = adView.findViewById(R.id.ad_body)
        adView.callToActionView = adView.findViewById(R.id.ad_call_to_action)
        adView.iconView = adView.findViewById(R.id.ad_app_icon)
        adView.mediaView = adView.findViewById(R.id.ad_media)

        (adView.headlineView as TextView).text = nativeAd.headline
        adView.bodyView?.let { body ->
            if (nativeAd.body == null) {
                body.visibility = View.GONE
            } else {
                body.visibility = View.VISIBLE
                (body as TextView).text = nativeAd.body
            }
        }

        adView.callToActionView?.let { cta ->
            if (nativeAd.callToAction == null) {
                cta.visibility = View.GONE
            } else {
                cta.visibility = View.VISIBLE
                (cta as Button).text = nativeAd.callToAction
            }
        }

        adView.iconView?.let { icon ->
            if (nativeAd.icon == null) {
                icon.visibility = View.GONE
            } else {
                icon.visibility = View.VISIBLE
                (icon as ImageView).setImageDrawable(nativeAd.icon!!.drawable)
            }
        }

        adView.mediaView?.mediaContent = nativeAd.mediaContent
        adView.setNativeAd(nativeAd)
        return adView
    }
}
