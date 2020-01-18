const path = require("path");
const argv = require("yargs").argv;  //获取命令行中参数的对象
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CleanPlugin = require("clean-webpack-plugin");
const webpack = require("webpack");

const isDev = argv.cfg && argv.cfg === "dev";  //是否为开发模式，如果输入yarn start执行"webpack-dev-server --mode development --cfg dev"，argv.cfg获取参数的值为dev。
let compileConfig = "index";
if (isDev) {
    compileConfig = "index." + argv.cfg;
}

const buildConfig = require(`./config/${compileConfig}`); // 开发模式下，引入index.dev.js中的配置信息。生产模式下，引入index.js中的配置信息
const modules = Object.keys(buildConfig);
const entry = Object.create(null);
const htmlPlugins = [];
if (modules.length > 0) {
    for (let srcModule of modules) {
        entry[srcModule] = path.resolve(__dirname, `./src/${srcModule}`);  // 多页面应用webpack配置文件entry属性的值
        htmlPlugins.push(  // html-webpack-plugin插件生成html的配置
            new HtmlWebpackPlugin({
                title: buildConfig[srcModule]["title"],
                filename: `${srcModule}/index.html`,
                template: path.resolve(__dirname, "./tpl/index.html"),
                chunks: [srcModule]
            })
        );
    }
}
const proxy = { //测试环境demo地址
    '/api/': {
        target: 'http://120.77.34.67:8118/',
        changeOrigin: true, //允许跨域
        secure: false //运行https
    }
};
const config = {
    entry,
    output: {
        publicPath: "/dist/",
        filename: "[name].[hash].js",
        path: path.resolve(__dirname, "dist")
    },
    module: {
        rules: [
            { // 除了node_modules文件夹中的文件，所有的tsx文件都用ts-loader处理
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/
            },
            {
                test: /\.js[x]?$/,
                use: 'babel-loader',
                exclude: /node_modules/
            },
            {
                test: /\.less|css$/,
                use: [  // webpack会从右往左加载loader，所有书写loader时有顺序要求
                    // {
                    //　　loader: 'style-loader'  //style-loader不能和mini-css-extract-plugin同时使用
                    // }
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader'
                    },
                    {
                        loader: 'less-loader'
                    },
                    {
                        loader: "postcss-loader",
                        options: {
                          ident: "postcss",  // postcss-loader中options里使用了function、require时需要ident属性，可以是任意值
                          plugins: () => [
                            require("postcss-flexbugs-fixes"),
                            autoprefixer({
                              browsers: [
                                ">1%",
                                "last 4 versions",
                                "Firefox ESR",
                                "not ie < 9"
                              ],
                              flexbox: "no-2009"  // false将禁用flexbox属性前缀。或flexbox:“no-2009”将仅为最终版本和IE版本的规范添加前缀。
                            })
                          ]
                        }
                    }
                ]
            },
            {
                test: /\.png|jpg|gif|jpeg|svg/,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 10000,   // 当图片小于limit（单位：byte）时图片转换成base64，大于limit时其表现行为等于file-loader
                       　　　name: './images/[name].[hash:8].[ext]'   // 当图片大于limit时起作用 ，'./images'表示图片打包的路径相对于output.path，[name]表示图片的名称，[hash:8]表示9位数的hash值，[ext]表示保持原来的后缀名
        　　　　　　　　　}
                    }
                ]
            },
            {
                test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
                loader: 'url-loader',
                options: {
                    limit: 10000,
                    name: './fonts/[name].[hash:8].[ext]'
                }
            } 
        ]
    },
    plugins: [
        new CleanPlugin(['dist']),
        ...htmlPlugins,
        new MiniCssExtractPlugin({
            filename: "[name].[hash].css",
            chunkFilename: "[name].[hash].css"
        }),
        new webpack.DefinePlugin({
            "process.env": { 
                NODE_ENV: JSON.stringify(process.env.NODE_ENV) 
            }
        })
    ],
    resolve: {
        extensions: [".tsx", ".ts", ".js", ".jsx"],
        alias: {
            "@":path.join(__dirname, './src/'),
            "%":path.join(__dirname, './src/public/')
        }
    },
    devtool: isDev ? "source-map" : false    // 值为source-map时，方便在浏览器中使用react开发工具调试
};

if (isDev) {  // 开发模式时，启动web服务
    config.devServer = {
        contentBase: './dist',  // 告诉服务器那个文件夹提供静态资源
        port: 9000,
        open: true,
        hot: false,  // 启用webpack中的热替换特性，这里我们不用热替换（不刷新整个页面的情况下更新部分更改）而用热更新（整个页面自动刷新）
        openPage: `dist/${modules[0]}`  // 打开index.dev.js配置中的第一个页面
        // proxy  是否开启代理
    };
    config.plugins.push(new webpack.HotModuleReplacementPlugin());  // 热替换需要的插件
}

module.exports = config;