import Flutter
import GoogleMobileAds
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate {
  private var nativeAdFactory: PerbugNativeAdFactory?

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GeneratedPluginRegistrant.register(with: self)

    nativeAdFactory = PerbugNativeAdFactory()
    if let factory = nativeAdFactory {
      FLTGoogleMobileAdsPlugin.registerNativeAdFactory(
        self,
        factoryId: "perbugNativeAdFactory",
        nativeAdFactory: factory
      )
    }

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  override func applicationWillTerminate(_ application: UIApplication) {
    FLTGoogleMobileAdsPlugin.unregisterNativeAdFactory(self, factoryId: "perbugNativeAdFactory")
    super.applicationWillTerminate(application)
  }
}

final class PerbugNativeAdFactory: NSObject, FLTNativeAdFactory {
  func createNativeAd(
    _ nativeAd: GADNativeAd,
    customOptions: [AnyHashable: Any]? = nil
  ) -> GADNativeAdView {
    let adView = GADNativeAdView(frame: CGRect(x: 0, y: 0, width: 0, height: 320))
    adView.backgroundColor = .secondarySystemBackground
    adView.layer.cornerRadius = 12
    adView.clipsToBounds = true

    let mediaView = GADMediaView()
    mediaView.translatesAutoresizingMaskIntoConstraints = false
    mediaView.heightAnchor.constraint(equalToConstant: 180).isActive = true

    let headlineLabel = UILabel()
    headlineLabel.font = .boldSystemFont(ofSize: 16)
    headlineLabel.numberOfLines = 2

    let bodyLabel = UILabel()
    bodyLabel.font = .systemFont(ofSize: 14)
    bodyLabel.numberOfLines = 2

    let iconView = UIImageView()
    iconView.translatesAutoresizingMaskIntoConstraints = false
    iconView.widthAnchor.constraint(equalToConstant: 40).isActive = true
    iconView.heightAnchor.constraint(equalToConstant: 40).isActive = true
    iconView.layer.cornerRadius = 6
    iconView.clipsToBounds = true

    let ctaButton = UIButton(type: .system)
    ctaButton.backgroundColor = .systemBlue
    ctaButton.tintColor = .white
    ctaButton.layer.cornerRadius = 8
    ctaButton.contentEdgeInsets = UIEdgeInsets(top: 8, left: 12, bottom: 8, right: 12)

    let footer = UIStackView(arrangedSubviews: [iconView, ctaButton])
    footer.axis = .horizontal
    footer.spacing = 8
    footer.alignment = .center

    let stack = UIStackView(arrangedSubviews: [mediaView, headlineLabel, bodyLabel, footer])
    stack.axis = .vertical
    stack.spacing = 8
    stack.translatesAutoresizingMaskIntoConstraints = false

    adView.addSubview(stack)
    NSLayoutConstraint.activate([
      stack.topAnchor.constraint(equalTo: adView.topAnchor, constant: 12),
      stack.leadingAnchor.constraint(equalTo: adView.leadingAnchor, constant: 12),
      stack.trailingAnchor.constraint(equalTo: adView.trailingAnchor, constant: -12),
      stack.bottomAnchor.constraint(equalTo: adView.bottomAnchor, constant: -12)
    ])

    adView.mediaView = mediaView
    adView.headlineView = headlineLabel
    adView.bodyView = bodyLabel
    adView.iconView = iconView
    adView.callToActionView = ctaButton

    headlineLabel.text = nativeAd.headline
    bodyLabel.text = nativeAd.body
    bodyLabel.isHidden = nativeAd.body == nil

    if let icon = nativeAd.icon?.image {
      iconView.image = icon
      iconView.isHidden = false
    } else {
      iconView.isHidden = true
    }

    if let cta = nativeAd.callToAction {
      ctaButton.setTitle(cta, for: .normal)
      ctaButton.isHidden = false
    } else {
      ctaButton.isHidden = true
    }

    mediaView.mediaContent = nativeAd.mediaContent
    adView.nativeAd = nativeAd

    return adView
  }
}
