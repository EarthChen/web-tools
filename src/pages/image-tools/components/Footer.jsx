function Footer() {
  return (
    <footer className="glass py-4">
      <div className="max-w-5xl mx-auto px-4 text-center">
        <p className="text-white/60 text-sm">
          &copy; {new Date().getFullYear()} EarthChen. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

export default Footer
