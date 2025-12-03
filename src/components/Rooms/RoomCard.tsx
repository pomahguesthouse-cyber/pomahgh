<Link to={`/rooms/${slug}`}>
  <Card
    className="
      h-[520px]                   /* tinggi card konsisten */
      flex flex-col               /* biar gambar & content rapi */
      overflow-hidden
      shadow-lg                   /* drop shadow default */
      hover:shadow-2xl            /* glow saat hover */
      transition-all duration-300 
      hover:-translate-y-1
      cursor-pointer
      group
    "
  >
    {/* IMAGE */}
    <div className="overflow-hidden">
      <img
        src={images?.[0] || "/placeholder.png"}
        className="
          w-full
          h-[260px]               /* tinggi gambar konsisten */
          object-cover
          transition-transform duration-500
          group-hover:scale-110   /* hover zoom */
        "
      />
    </div>

    {/* CONTENT */}
    <CardContent className="p-4 flex flex-col flex-1">{/* ... your content here ... */}</CardContent>
  </Card>
</Link>;
