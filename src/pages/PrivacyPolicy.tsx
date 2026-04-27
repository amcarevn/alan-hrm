export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="prose prose-lg max-w-none">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Chính sách quyền riêng tư
        </h1>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
          <p className="text-blue-800">
            <strong>Cập nhật lần cuối:</strong>{' '}
            {new Date().toLocaleDateString('vi-VN')}
          </p>
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            1. Thông tin chúng tôi thu thập
          </h2>
          <p className="mb-4 text-gray-900">
            Alan Medical Service ("chúng tôi", "của chúng tôi", hoặc "dịch vụ")
            thu thập các loại thông tin sau đây:
          </p>

          <h3 className="text-xl font-medium text-gray-900 mb-3">
            1.1 Thông tin bạn cung cấp trực tiếp
          </h3>
          <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-900">
            <li>Thông tin liên hệ (tên, email, số điện thoại)</li>
            <li>Thông tin cá nhân (ngày sinh, giới tính)</li>
            <li>Thông tin y tế cơ bản khi đặt lịch hẹn</li>
            <li>Nội dung tin nhắn và phản hồi</li>
          </ul>

          <h3 className="text-xl font-medium text-gray-900 mb-3">
            1.2 Thông tin thu thập tự động
          </h3>
          <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-900">
            <li>
              Thông tin thiết bị (loại thiết bị, hệ điều hành, trình duyệt)
            </li>
            <li>Thông tin mạng (địa chỉ IP, nhà cung cấp dịch vụ internet)</li>
            <li>
              Dữ liệu sử dụng (trang đã truy cập, thời gian truy cập, tương tác)
            </li>
            <li>Cookies và công nghệ theo dõi tương tự</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            2. Mục đích sử dụng thông tin
          </h2>
          <p className="mb-4 text-gray-900">
            Chúng tôi sử dụng thông tin thu thập được cho các mục đích sau:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-900">
            <li>Cung cấp và cải thiện dịch vụ y tế</li>
            <li>Xử lý đặt lịch hẹn và quản lý hồ sơ bệnh nhân</li>
            <li>Liên lạc với bạn về lịch hẹn và thông tin y tế</li>
            <li>Gửi thông báo quan trọng về dịch vụ</li>
            <li>Phân tích và cải thiện trải nghiệm người dùng</li>
            <li>Tuân thủ các yêu cầu pháp lý</li>
            <li>Bảo mật và ngăn chặn gian lận</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            3. Chia sẻ thông tin
          </h2>
          <p className="mb-4 text-gray-900">
            Chúng tôi có thể chia sẻ thông tin của bạn trong các trường hợp sau:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-900">
            <li>Với sự đồng ý rõ ràng của bạn</li>
            <li>Với nhà cung cấp dịch vụ y tế được ủy quyền</li>
            <li>Để tuân thủ luật pháp hoặc yêu cầu của cơ quan chức năng</li>
            <li>Để bảo vệ quyền lợi, tài sản hoặc an toàn của chúng tôi</li>
            <li>Trong trường hợp sáp nhập, mua lại hoặc bán tài sản</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            4. Bảo mật thông tin
          </h2>
          <p className="mb-4 text-gray-900">
            Chúng tôi thực hiện các biện pháp bảo mật phù hợp để bảo vệ thông
            tin cá nhân của bạn:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-900">
            <li>Mã hóa dữ liệu trong quá trình truyền tải và lưu trữ</li>
            <li>Kiểm soát truy cập nghiêm ngặt</li>
            <li>Giám sát và kiểm tra bảo mật thường xuyên</li>
            <li>Đào tạo nhân viên về bảo mật thông tin</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            5. Quyền của bạn
          </h2>
          <p className="mb-4 text-gray-900">
            Bạn có các quyền sau đối với thông tin cá nhân của mình:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-900">
            <li>Quyền truy cập và xem thông tin</li>
            <li>Quyền chỉnh sửa thông tin không chính xác</li>
            <li>Quyền xóa thông tin cá nhân</li>
            <li>Quyền hạn chế xử lý thông tin</li>
            <li>Quyền di chuyển dữ liệu</li>
            <li>Quyền phản đối việc xử lý</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            6. Yêu cầu xóa dữ liệu
          </h2>
          <p className="mb-4 text-gray-900">
            Để yêu cầu xóa dữ liệu cá nhân của bạn, vui lòng liên hệ với chúng
            tôi qua:
          </p>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <ul className="space-y-2 text-gray-900">
              <li>
                <strong>Email:</strong> privacy@alanmedical.com
              </li>
              <li>
                <strong>Điện thoại:</strong> +84 123 456 789
              </li>
              <li>
                <strong>Địa chỉ:</strong> 123 Đường ABC, Quận 1, TP.HCM, Việt
                Nam
              </li>
            </ul>
          </div>
          <p className="mb-4 text-gray-900">
            Chúng tôi sẽ phản hồi yêu cầu của bạn trong vòng 30 ngày và thực
            hiện xóa dữ liệu theo quy định pháp luật.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            7. Cookies và công nghệ theo dõi
          </h2>
          <p className="mb-4 text-gray-900">
            Chúng tôi sử dụng cookies và công nghệ tương tự để:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-900">
            <li>Ghi nhớ tùy chọn và cài đặt của bạn</li>
            <li>Phân tích lưu lượng truy cập và sử dụng</li>
            <li>Cải thiện hiệu suất và trải nghiệm người dùng</li>
            <li>Cung cấp nội dung được cá nhân hóa</li>
          </ul>
          <p className="mb-4 text-gray-900">
            Bạn có thể kiểm soát cookies thông qua cài đặt trình duyệt của mình.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            8. Thay đổi chính sách
          </h2>
          <p className="mb-4 text-gray-900">
            Chúng tôi có thể cập nhật chính sách quyền riêng tư này theo thời
            gian. Những thay đổi quan trọng sẽ được thông báo qua email hoặc
            thông báo trên website.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            9. Liên hệ
          </h2>
          <p className="mb-4 text-gray-900">
            Nếu bạn có câu hỏi về chính sách quyền riêng tư này, vui lòng liên
            hệ:
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-900">
              <strong>CÔNG TY CP THƯƠNG MẠI VÀ DỊCH VỤ ALAN</strong>
            </p>
            <p className="text-gray-900">Email: info@alanbeautyclinic.com</p>
            <p className="text-gray-900">Điện thoại: +84916-258-766</p>
            <p className="text-gray-900">
              Địa chỉ: 167 Trung Kính, Yên Hoà, Cầu Giấy, Hà Nội
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            10. Dữ liệu từ Facebook
          </h2>
          <p className="mb-4 text-gray-900">
            Khi bạn đăng nhập hoặc kết nối tài khoản Facebook với dịch vụ của
            chúng tôi, chúng tôi có thể thu thập các dữ liệu được cấp quyền từ
            Facebook bao gồm:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-900">
            <li>ID người dùng Facebook, tên hiển thị, ảnh đại diện</li>
            <li>Danh sách Trang mà bạn quản lý (pages_show_list)</li>
            <li>
              Thông tin cần thiết để gửi và nhận tin nhắn từ Trang
              (pages_messaging)
            </li>
            <li>Các quyền truy cập khác mà bạn đã đồng ý cấp</li>
          </ul>

          <p className="mb-4 text-gray-900">
            Chúng tôi sử dụng dữ liệu này để:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2 text-gray-900">
            <li>Cho phép bạn quản lý và trả lời tin nhắn khách hàng</li>
            <li>Cung cấp báo cáo và thống kê hiệu quả chăm sóc khách hàng</li>
            <li>Cải thiện trải nghiệm người dùng và chất lượng dịch vụ</li>
          </ul>

          <p className="mb-4 text-gray-900">
            Bạn có thể hủy quyền truy cập bất kỳ lúc nào trong phần cài đặt
            Facebook hoặc liên hệ trực tiếp với chúng tôi để yêu cầu xóa dữ
            liệu. Dữ liệu này không được bán hoặc chia sẻ cho bên thứ ba, và chỉ
            được lưu trữ trong thời gian cần thiết để cung cấp dịch vụ.
          </p>
        </section>
      </div>
    </div>
  );
}
